import { Request, Response, NextFunction } from 'express';
import { Quiz, IQuiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { Participant } from '../models/Participant';
import { Answer } from '../models/Answer';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { createQuizSchema, updateQuizSchema } from '../validators/schemas';
import { getIO } from '../socket/socketHandler';
import { LeaderboardService } from '../services/leaderboardService';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function listQuizzes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (error) {
    next(error);
  }
}

export async function getQuizById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }
    res.json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
}

export async function getQuizByRoomCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roomCode } = req.params;
    const quiz = await Quiz.findOne({ roomCode: roomCode.toUpperCase() });
    if (!quiz) {
      throw new AppError('Quiz with this room code not found', 404);
    }
    // Return sanitized public representation for students
    res.json({
      success: true,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        roomCode: quiz.roomCode,
        status: quiz.status,
        durationMinutes: quiz.durationMinutes,
        totalQuestions: quiz.totalQuestions,
        maxScore: quiz.maxScore,
        deadline: quiz.deadline,
        registrationSettings: quiz.registrationSettings,
        scoringSettings: {
          defaultPoints: quiz.scoringSettings.defaultPoints,
          negativeMarkingEnabled: quiz.scoringSettings.negativeMarkingEnabled,
          speedBonusEnabled: quiz.scoringSettings.speedBonusEnabled,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createQuizSchema.parse(req.body);

    let roomCode = generateRoomCode();
    while (await Quiz.exists({ roomCode })) {
      roomCode = generateRoomCode();
    }

    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    const quiz = new Quiz({
      ...data,
      slug,
      roomCode,
      creator: req.user?._id,
      status: 'DRAFT',
    });

    await quiz.save();

    await AuditLog.create({
      actorEmail: req.user?.email || 'admin',
      actorRole: 'admin',
      action: 'QUIZ_CREATED',
      targetResource: 'Quiz',
      targetId: quiz._id.toString(),
      metadata: { title: quiz.title, roomCode: quiz.roomCode },
    });

    res.status(201).json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
}

export async function updateQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new AppError('Quiz not found', 404);

    if (quiz.status === 'LIVE' || quiz.status === 'COMPLETED') {
      throw new AppError('Cannot modify quiz configuration while test is LIVE or COMPLETED', 400);
    }

    const data = updateQuizSchema.parse(req.body);
    Object.assign(quiz, data);
    await quiz.save();

    await AuditLog.create({
      actorEmail: req.user?.email || 'admin',
      actorRole: 'admin',
      action: 'QUIZ_UPDATED',
      targetResource: 'Quiz',
      targetId: quiz._id.toString(),
      metadata: data,
    });

    res.json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
}

export async function updateQuizStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, extraMinutes, resetAnswers } = req.body;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const oldStatus = quiz.status;
    const io = getIO();

    if (status === 'PUBLISHED') {
      quiz.status = 'PUBLISHED';
    } else if (status === 'WAITING') {
      quiz.status = 'WAITING';
      quiz.completedAt = undefined;
      quiz.pausedAt = undefined;
      quiz.pauseRemainingSeconds = undefined;

      if (resetAnswers) {
        await Answer.deleteMany({ quizId: quiz._id });
        await Participant.updateMany(
          { quizId: quiz._id },
          {
            $set: {
              status: 'WAITING',
              totalScore: 0,
              baseScore: 0,
              bonusScore: 0,
              rank: 0,
              correctCount: 0,
              incorrectCount: 0,
              unansweredCount: 0,
              cumulativeResponseTimeMs: 0,
              startedAt: undefined,
              completedAt: undefined,
            },
          }
        );
      } else {
        await Participant.updateMany(
          { quizId: quiz._id },
          { $set: { status: 'WAITING', completedAt: undefined } }
        );
      }

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:status', { status: 'WAITING', quizId: quiz._id, isReset: true });
        await LeaderboardService.broadcastLeaderboard(io, quiz._id.toString());
      }
    } else if (status === 'LIVE') {
      const isReopen = quiz.status === 'COMPLETED';
      const now = new Date();
      const durationMins = extraMinutes && extraMinutes > 0 ? Number(extraMinutes) : quiz.durationMinutes;
      const deadline = new Date(now.getTime() + durationMins * 60 * 1000);

      quiz.status = 'LIVE';
      if (!quiz.actualStartTime || isReopen) {
        quiz.actualStartTime = now;
      }
      quiz.deadline = deadline;
      quiz.completedAt = undefined;
      quiz.pausedAt = undefined;
      quiz.pauseRemainingSeconds = undefined;

      // Update participants: restore any waiting or prematurely completed participants to IN_PROGRESS
      await Participant.updateMany(
        { quizId: quiz._id, status: { $in: ['WAITING', 'COMPLETED'] } },
        { $set: { status: 'IN_PROGRESS', startedAt: now, completedAt: undefined } }
      );

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:started', {
          quizId: quiz._id,
          startTime: now.toISOString(),
          deadline: deadline.toISOString(),
          durationMinutes: durationMins,
          isReopened: isReopen,
        });
        io.to(`quiz:${quiz._id}`).emit('quiz:status', { status: 'LIVE', quizId: quiz._id, isReopened: isReopen });
        await LeaderboardService.broadcastLeaderboard(io, quiz._id.toString());
      }
    } else if (status === 'PAUSED') {
      if (quiz.status !== 'LIVE') throw new AppError('Only live quizzes can be paused', 400);
      const now = new Date();
      const remainingSeconds = quiz.deadline ? Math.max(0, Math.floor((quiz.deadline.getTime() - now.getTime()) / 1000)) : 0;
      quiz.status = 'PAUSED';
      quiz.pausedAt = now;
      quiz.pauseRemainingSeconds = remainingSeconds;

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:paused', { quizId: quiz._id, remainingSeconds });
      }
    } else if (status === 'RESUMED') {
      if (quiz.status !== 'PAUSED') throw new AppError('Only paused quizzes can be resumed', 400);
      const remainingSecs = quiz.pauseRemainingSeconds || 60;
      const newDeadline = new Date(Date.now() + remainingSecs * 1000);
      quiz.status = 'LIVE';
      quiz.deadline = newDeadline;
      quiz.pausedAt = undefined;
      quiz.pauseRemainingSeconds = undefined;

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:resumed', { quizId: quiz._id, deadline: newDeadline.toISOString() });
      }
    } else if (status === 'COMPLETED') {
      quiz.status = 'COMPLETED';
      quiz.completedAt = new Date();

      // Finalize any in-progress participants
      await Participant.updateMany(
        { quizId: quiz._id, status: { $in: ['WAITING', 'IN_PROGRESS'] } },
        { $set: { status: 'COMPLETED', completedAt: new Date() } }
      );

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:ended', { quizId: quiz._id, completedAt: quiz.completedAt.toISOString() });
        await LeaderboardService.broadcastLeaderboard(io, quiz._id.toString());
      }
    } else {
      throw new AppError(`Invalid status transition to ${status}`, 400);
    }

    await quiz.save();

    await AuditLog.create({
      actorEmail: req.user?.email || 'admin',
      actorRole: 'admin',
      action: `QUIZ_STATE_${quiz.status}`,
      targetResource: 'Quiz',
      targetId: quiz._id.toString(),
      metadata: { oldStatus, newStatus: quiz.status },
    });

    res.json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
}

export async function restartQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { mode, extraMinutes, resetAnswers } = req.body; // mode: 'reopen' | 'waiting' | 'clean-restart'
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const io = getIO();

    if (mode === 'waiting' || mode === 'clean-restart') {
      quiz.status = 'WAITING';
      quiz.completedAt = undefined;
      quiz.pausedAt = undefined;
      quiz.pauseRemainingSeconds = undefined;
      quiz.actualStartTime = undefined;
      quiz.deadline = undefined;

      if (resetAnswers || mode === 'clean-restart') {
        await Answer.deleteMany({ quizId: quiz._id });
        await Participant.updateMany(
          { quizId: quiz._id },
          {
            $set: {
              status: 'WAITING',
              totalScore: 0,
              baseScore: 0,
              bonusScore: 0,
              rank: 0,
              correctCount: 0,
              incorrectCount: 0,
              unansweredCount: 0,
              cumulativeResponseTimeMs: 0,
              startedAt: undefined,
              completedAt: undefined,
            },
          }
        );
      } else {
        await Participant.updateMany(
          { quizId: quiz._id },
          { $set: { status: 'WAITING', completedAt: undefined } }
        );
      }

      await quiz.save();

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:status', { status: 'WAITING', quizId: quiz._id, isReset: true });
        await LeaderboardService.broadcastLeaderboard(io, quiz._id.toString());
      }
    } else {
      // Default: 'reopen' - undo accidental completion and restore test to LIVE
      const now = new Date();
      const durationMins = extraMinutes && extraMinutes > 0 ? Number(extraMinutes) : quiz.durationMinutes;
      const deadline = new Date(now.getTime() + durationMins * 60 * 1000);

      quiz.status = 'LIVE';
      if (!quiz.actualStartTime) {
        quiz.actualStartTime = now;
      }
      quiz.deadline = deadline;
      quiz.completedAt = undefined;
      quiz.pausedAt = undefined;
      quiz.pauseRemainingSeconds = undefined;

      // Restore participants whose test was ended prematurely
      await Participant.updateMany(
        { quizId: quiz._id, status: { $in: ['WAITING', 'COMPLETED'] } },
        { $set: { status: 'IN_PROGRESS', startedAt: now, completedAt: undefined } }
      );

      await quiz.save();

      if (io) {
        io.to(`quiz:${quiz._id}`).emit('quiz:started', {
          quizId: quiz._id,
          startTime: now.toISOString(),
          deadline: deadline.toISOString(),
          durationMinutes: durationMins,
          isReopened: true,
        });
        io.to(`quiz:${quiz._id}`).emit('quiz:status', { status: 'LIVE', quizId: quiz._id, isReopened: true });
        await LeaderboardService.broadcastLeaderboard(io, quiz._id.toString());
      }
    }

    await AuditLog.create({
      actorEmail: req.user?.email || 'admin',
      actorRole: 'admin',
      action: 'QUIZ_RESTARTED',
      targetResource: 'Quiz',
      targetId: quiz._id.toString(),
      metadata: { mode, status: quiz.status },
    });

    res.json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
}

export async function duplicateQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const sourceQuiz = await Quiz.findById(id);
    if (!sourceQuiz) throw new AppError('Quiz not found', 404);

    let roomCode = generateRoomCode();
    while (await Quiz.exists({ roomCode })) {
      roomCode = generateRoomCode();
    }

    const newQuiz = new Quiz({
      title: `${sourceQuiz.title} (Copy)`,
      slug: `${sourceQuiz.slug}-copy`,
      description: sourceQuiz.description,
      instructions: sourceQuiz.instructions,
      roomCode,
      creator: req.user?._id,
      status: 'DRAFT',
      durationMinutes: sourceQuiz.durationMinutes,
      totalQuestions: sourceQuiz.totalQuestions,
      maxScore: sourceQuiz.maxScore,
      scoringSettings: sourceQuiz.scoringSettings,
      registrationSettings: sourceQuiz.registrationSettings,
      feedbackPolicy: sourceQuiz.feedbackPolicy,
    });

    await newQuiz.save();

    // Copy questions
    const questions = await Question.find({ quizId: sourceQuiz._id });
    for (const q of questions) {
      await Question.create({
        quizId: newQuiz._id,
        text: q.text,
        type: q.type,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        points: q.points,
        negativeMarks: q.negativeMarks,
        explanation: q.explanation,
        order: q.order,
      });
    }

    res.status(201).json({ success: true, quiz: newQuiz });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new AppError('Quiz not found', 404);

    await Question.deleteMany({ quizId: id });
    await Participant.deleteMany({ quizId: id });
    await Quiz.findByIdAndDelete(id);

    await AuditLog.create({
      actorEmail: req.user?.email || 'admin',
      actorRole: 'admin',
      action: 'QUIZ_DELETED',
      targetResource: 'Quiz',
      targetId: id,
      metadata: { title: quiz.title },
    });

    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    next(error);
  }
}
