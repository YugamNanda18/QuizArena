import { Request, Response, NextFunction } from 'express';
import { Quiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { Participant } from '../models/Participant';
import { Answer } from '../models/Answer';
import { AppError } from '../middleware/errorHandler';
import { submitAnswerSchema } from '../validators/schemas';
import { ScoringEngine } from '../services/scoringEngine';
import { LeaderboardService } from '../services/leaderboardService';
import { getIO } from '../socket/socketHandler';

export async function submitAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const serverReceivedAt = new Date();

  try {
    const data = submitAnswerSchema.parse(req.body);
    const { quizId, participantId, questionId, selectedOptionIndex } = data;

    // 1. Verify Quiz & State
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    if (quiz.status !== 'LIVE') {
      throw new AppError(`Cannot submit answer. Assessment is currently in ${quiz.status} status.`, 400);
    }

    // 2. Authoritative Server Deadline Check
    if (quiz.deadline && serverReceivedAt.getTime() > quiz.deadline.getTime()) {
      throw new AppError('Submission rejected: The assessment deadline has expired.', 400);
    }

    // 3. Verify Participant
    const participant = await Participant.findOne({ _id: participantId, quizId });
    if (!participant) {
      throw new AppError('Participant not found or not registered for this assessment.', 404);
    }

    // 4. Verify Question
    const question = await Question.findOne({ _id: questionId, quizId });
    if (!question) {
      throw new AppError('Question not found in this assessment.', 404);
    }

    if (selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) {
      throw new AppError('Invalid option selected.', 400);
    }

    // 5. Idempotency Check: Prevent duplicate answers & double scoring
    const existingAnswer = await Answer.findOne({ quizId, participantId, questionId });
    if (existingAnswer) {
      // Return previous confirmed result idempotently
      res.json({
        success: true,
        idempotent: true,
        message: 'Answer was already recorded.',
        pointsAwarded: existingAnswer.pointsAwarded,
        isCorrect: quiz.feedbackPolicy?.showScoreImmediately ? existingAnswer.isCorrect : undefined,
        currentScore: participant.totalScore,
        currentRank: participant.rank,
      });
      return;
    }

    // 6. Authoritative Scoring Evaluation
    const questionAvailableAt = quiz.actualStartTime || serverReceivedAt;
    const evalResult = ScoringEngine.evaluateAnswer(
      quiz,
      question,
      selectedOptionIndex,
      serverReceivedAt,
      questionAvailableAt
    );

    // 7. Persist Answer
    const answer = new Answer({
      quizId,
      participantId,
      questionId,
      selectedOptionIndex,
      isCorrect: evalResult.isCorrect,
      basePoints: evalResult.basePoints,
      speedBonus: evalResult.speedBonus,
      pointsAwarded: evalResult.pointsAwarded,
      serverReceivedAt,
      responseTimeMs: evalResult.responseTimeMs,
    });

    try {
      await answer.save();
    } catch (saveErr: any) {
      // Concurrency duplicate prevention
      if (saveErr.code === 11000) {
        const saved = await Answer.findOne({ quizId, participantId, questionId });
        res.json({
          success: true,
          idempotent: true,
          message: 'Answer already received via concurrent request.',
          pointsAwarded: saved?.pointsAwarded ?? 0,
          currentScore: participant.totalScore,
          currentRank: participant.rank,
        });
        return;
      }
      throw saveErr;
    }

    // 8. Update Participant Record
    participant.totalScore += evalResult.pointsAwarded;
    participant.baseScore += evalResult.basePoints;
    participant.bonusScore += evalResult.speedBonus;

    if (evalResult.isCorrect) {
      participant.correctCount += 1;
      participant.cumulativeResponseTimeMs += evalResult.responseTimeMs;
    } else {
      participant.incorrectCount += 1;
    }

    // Check if participant completed all questions
    const totalAnswered = await Answer.countDocuments({ quizId, participantId });
    if (quiz.totalQuestions > 0 && totalAnswered >= quiz.totalQuestions) {
      participant.status = 'COMPLETED';
      participant.completedAt = serverReceivedAt;
    }

    await participant.save();

    // 9. Recompute & Broadcast Live Leaderboard
    const io = getIO();
    let updatedLeaderboard = [];
    if (io) {
      updatedLeaderboard = await LeaderboardService.broadcastLeaderboard(io, quizId);
    } else {
      updatedLeaderboard = await LeaderboardService.getAndRecomputeLeaderboard(quizId);
    }

    // Find student's updated rank
    const myEntry = updatedLeaderboard.find((entry) => entry.id === participant._id.toString());
    const currentRank = myEntry ? myEntry.rank : participant.rank;

    // 10. Return server-confirmed score response
    res.json({
      success: true,
      pointsAwarded: evalResult.pointsAwarded,
      basePoints: evalResult.basePoints,
      speedBonus: evalResult.speedBonus,
      isCorrect: quiz.feedbackPolicy?.showScoreImmediately ? evalResult.isCorrect : undefined,
      currentScore: participant.totalScore,
      currentRank,
      isCompleted: participant.status === 'COMPLETED',
    });
  } catch (error) {
    next(error);
  }
}

export async function getSubmittedAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId, participantId } = req.params;
    const answers = await Answer.find({ quizId, participantId }).select('-__v');
    res.json({ success: true, answers });
  } catch (error) {
    next(error);
  }
}
