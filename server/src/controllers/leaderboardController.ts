import { Request, Response, NextFunction } from 'express';
import { LeaderboardService } from '../services/leaderboardService';
import { Participant } from '../models/Participant';
import { Quiz } from '../models/Quiz';
import { Answer } from '../models/Answer';
import { Question } from '../models/Question';
import { AppError } from '../middleware/errorHandler';

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const leaderboard = await LeaderboardService.getAndRecomputeLeaderboard(quizId);
    res.json({ success: true, leaderboard });
  } catch (error) {
    next(error);
  }
}

export async function getParticipantResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId, participantId } = req.params;
    const participant = await Participant.findOne({ _id: participantId, quizId });
    if (!participant) throw new AppError('Participant result not found', 404);

    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const answers = await Answer.find({ quizId, participantId });
    const questions = await Question.find({ quizId }).sort({ order: 1 });

    const totalAnswered = participant.correctCount + participant.incorrectCount;
    const accuracy = totalAnswered > 0 ? Math.round((participant.correctCount / totalAnswered) * 100) : 0;

    // Build question-wise breakdown for result page
    const breakdown = questions.map((q, idx) => {
      const ans = answers.find((a) => a.questionId.toString() === q._id.toString());
      return {
        questionNumber: idx + 1,
        questionText: q.text,
        options: q.options,
        points: q.points,
        selectedOptionIndex: ans ? ans.selectedOptionIndex : null,
        isCorrect: ans ? ans.isCorrect : false,
        pointsAwarded: ans ? ans.pointsAwarded : 0,
        responseTimeMs: ans ? ans.responseTimeMs : 0,
        correctOptionIndex: quiz.feedbackPolicy?.showCorrectAnswersAfterQuiz ? q.correctOptionIndex : undefined,
        explanation: quiz.feedbackPolicy?.showCorrectAnswersAfterQuiz ? q.explanation : undefined,
      };
    });

    const resultPayload = {
      participant: {
        id: participant._id,
        name: participant.name,
        email: participant.email,
        studentId: participant.studentId,
        totalScore: participant.totalScore,
        baseScore: participant.baseScore,
        bonusScore: participant.bonusScore,
        rank: participant.rank,
        correctCount: participant.correctCount,
        incorrectCount: participant.incorrectCount,
        unansweredCount: Math.max(0, quiz.totalQuestions - (participant.correctCount + participant.incorrectCount)),
        accuracy,
        cumulativeResponseTimeMs: participant.cumulativeResponseTimeMs,
        status: participant.status,
        completedAt: participant.completedAt,
      },
      quiz: {
        id: quiz._id,
        title: quiz.title,
        maxScore: quiz.maxScore,
        totalQuestions: quiz.totalQuestions,
        roomCode: quiz.roomCode,
        status: quiz.status,
        feedbackPolicy: quiz.feedbackPolicy,
      },
      breakdown,
    };

    res.json({
      success: true,
      result: resultPayload,
      ...resultPayload,
    });
  } catch (error) {
    next(error);
  }
}
