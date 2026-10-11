import { Request, Response, NextFunction } from 'express';
import { Quiz } from '../models/Quiz';
import { Participant } from '../models/Participant';
import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../middleware/errorHandler';

export async function getAdminOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const totalQuizzes = await Quiz.countDocuments();
    const liveQuizzes = await Quiz.countDocuments({ status: 'LIVE' });
    const waitingQuizzes = await Quiz.countDocuments({ status: 'WAITING' });
    const completedQuizzes = await Quiz.countDocuments({ status: 'COMPLETED' });
    const totalParticipants = await Participant.countDocuments();
    const totalAnswers = await Answer.countDocuments();

    // Calculate overall average score
    const avgScoreAgg = await Participant.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$totalScore' } } },
    ]);
    const averageScore = avgScoreAgg.length > 0 ? Math.round(avgScoreAgg[0].avgScore || 0) : 0;

    const recentQuizzes = await Quiz.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      stats: {
        totalQuizzes,
        activeQuizzes: liveQuizzes + waitingQuizzes,
        liveQuizzes,
        completedQuizzes,
        totalParticipants,
        totalAnswers,
        averageScore,
      },
      recentQuizzes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const participants = await Participant.find({ quizId });
    const questions = await Question.find({ quizId }).sort({ order: 1 });
    const answers = await Answer.find({ quizId });

    const totalParticipants = participants.length;
    const completedCount = participants.filter((p) => p.status === 'COMPLETED').length;
    const completionRate = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

    const totalScores = participants.map((p) => p.totalScore);
    const avgScore = totalScores.length > 0 ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0;
    const topScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;

    // Question-wise performance analysis
    const questionAnalytics = questions.map((q, idx) => {
      const qAnswers = answers.filter((a) => a.questionId.toString() === q._id.toString());
      const totalAttempted = qAnswers.length;
      const correctAnswers = qAnswers.filter((a) => a.isCorrect).length;
      const accuracy = totalAttempted > 0 ? Math.round((correctAnswers / totalAttempted) * 100) : 0;
      const avgResponseTimeMs = totalAttempted > 0
        ? Math.round(qAnswers.reduce((sum, a) => sum + a.responseTimeMs, 0) / totalAttempted)
        : 0;

      return {
        questionId: q._id,
        questionNumber: idx + 1,
        text: q.text,
        points: q.points,
        totalAttempted,
        correctAnswers,
        accuracy,
        avgResponseTimeMs,
      };
    });

    // Score distribution buckets: 0-25%, 26-50%, 51-75%, 76-100%
    const maxScore = quiz.maxScore || 100;
    const distribution = [
      { range: '0-25%', count: 0 },
      { range: '26-50%', count: 0 },
      { range: '51-75%', count: 0 },
      { range: '76-100%', count: 0 },
    ];

    participants.forEach((p) => {
      const pct = maxScore > 0 ? (p.totalScore / maxScore) * 100 : 0;
      if (pct <= 25) distribution[0].count++;
      else if (pct <= 50) distribution[1].count++;
      else if (pct <= 75) distribution[2].count++;
      else distribution[3].count++;
    });

    res.json({
      success: true,
      analytics: {
        quizId,
        title: quiz.title,
        status: quiz.status,
        totalParticipants,
        completedCount,
        completionRate,
        avgScore,
        topScore,
        maxPossibleScore: quiz.maxScore,
        questionAnalytics,
        distribution,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
}
