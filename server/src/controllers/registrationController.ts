import { Request, Response, NextFunction } from 'express';
import { Quiz } from '../models/Quiz';
import { Participant } from '../models/Participant';
import { AppError } from '../middleware/errorHandler';
import { studentRegistrationSchema } from '../validators/schemas';
import { getIO } from '../socket/socketHandler';

export async function registerStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = studentRegistrationSchema.parse(req.body);

    let quiz;
    if (data.quizId) {
      quiz = await Quiz.findById(data.quizId);
    } else if (data.roomCode) {
      quiz = await Quiz.findOne({ roomCode: data.roomCode.toUpperCase() });
    }

    if (!quiz) {
      throw new AppError('Quiz not found with the provided identifier or room code', 404);
    }

    // Check quiz status
    if (quiz.status === 'COMPLETED' || quiz.status === 'CANCELLED') {
      throw new AppError('Registration is closed. This quiz has concluded.', 400);
    }

    if (quiz.status === 'LIVE' && !quiz.registrationSettings?.allowLateJoin) {
      throw new AppError('The test is already in progress and late joining is not permitted by the administrator.', 400);
    }

    if (quiz.registrationSettings?.requireStudentId && !data.studentId) {
      throw new AppError('Student ID is required to register for this assessment.', 400);
    }

    const email = data.email.toLowerCase().trim();

    // Check for existing registration
    let participant = await Participant.findOne({ quizId: quiz._id, email });

    if (participant) {
      // Re-joining student: allow seamless reconnection without duplicate record
      res.json({
        success: true,
        reconnected: true,
        participant: {
          id: participant._id,
          name: participant.name,
          email: participant.email,
          studentId: participant.studentId,
          status: participant.status,
          totalScore: participant.totalScore,
          rank: participant.rank,
        },
        quiz: {
          id: quiz._id,
          title: quiz.title,
          roomCode: quiz.roomCode,
          status: quiz.status,
          durationMinutes: quiz.durationMinutes,
          deadline: quiz.deadline,
          maxScore: quiz.maxScore,
        },
      });
      return;
    }

    // Create new participant
    participant = new Participant({
      quizId: quiz._id,
      name: data.name.trim(),
      email,
      studentId: data.studentId?.trim(),
      status: quiz.status === 'LIVE' ? 'IN_PROGRESS' : 'WAITING',
      registeredAt: new Date(),
    });

    await participant.save();

    const io = getIO();
    if (io) {
      const count = await Participant.countDocuments({ quizId: quiz._id });
      io.to(`quiz:${quiz._id}`).emit('participant:joined', {
        quizId: quiz._id,
        participant: {
          id: participant._id,
          name: participant.name,
          email: participant.email,
          status: participant.status,
        },
        totalRegistered: count,
      });
    }

    res.status(201).json({
      success: true,
      participant: {
        id: participant._id,
        name: participant.name,
        email: participant.email,
        studentId: participant.studentId,
        status: participant.status,
        totalScore: participant.totalScore,
        rank: participant.rank,
      },
      quiz: {
        id: quiz._id,
        title: quiz.title,
        roomCode: quiz.roomCode,
        status: quiz.status,
        durationMinutes: quiz.durationMinutes,
        deadline: quiz.deadline,
        maxScore: quiz.maxScore,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getParticipantStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { participantId } = req.params;
    const participant = await Participant.findById(participantId);
    if (!participant) throw new AppError('Participant not found', 404);

    const quiz = await Quiz.findById(participant.quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    res.json({
      success: true,
      participant: {
        id: participant._id,
        name: participant.name,
        email: participant.email,
        studentId: participant.studentId,
        status: participant.status,
        totalScore: participant.totalScore,
        baseScore: participant.baseScore,
        bonusScore: participant.bonusScore,
        rank: participant.rank,
        correctCount: participant.correctCount,
        incorrectCount: participant.incorrectCount,
        unansweredCount: participant.unansweredCount,
        cumulativeResponseTimeMs: participant.cumulativeResponseTimeMs,
      },
      quiz: {
        id: quiz._id,
        title: quiz.title,
        roomCode: quiz.roomCode,
        status: quiz.status,
        durationMinutes: quiz.durationMinutes,
        startTime: quiz.actualStartTime,
        deadline: quiz.deadline,
        maxScore: quiz.maxScore,
        feedbackPolicy: quiz.feedbackPolicy,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listParticipantsForQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const participants = await Participant.find({ quizId }).sort({ rank: 1, totalScore: -1 });
    res.json({ success: true, participants });
  } catch (error) {
    next(error);
  }
}
