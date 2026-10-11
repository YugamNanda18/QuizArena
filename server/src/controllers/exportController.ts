import { Request, Response, NextFunction } from 'express';
import { Quiz } from '../models/Quiz';
import { Participant } from '../models/Participant';
import { Answer } from '../models/Answer';
import { Question } from '../models/Question';
import { ReportService } from '../services/reportService';
import { AppError } from '../middleware/errorHandler';

export async function downloadStudentPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId, participantId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const participant = await Participant.findOne({ _id: participantId, quizId });
    if (!participant) throw new AppError('Participant not found', 404);

    const answers = await Answer.find({ quizId, participantId });
    const questions = await Question.find({ quizId }).sort({ order: 1 });

    const pdfBuffer = await ReportService.generateStudentReportPDF(quiz, participant, answers, questions);

    const sanitizedName = participant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="QuizArena_${quiz.roomCode}_${sanitizedName}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function downloadConsolidatedPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const participants = await Participant.find({ quizId }).sort({ rank: 1, totalScore: -1 });
    const pdfBuffer = await ReportService.generateConsolidatedQuizReportPDF(quiz, participants);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="QuizArena_${quiz.roomCode}_Consolidated_Report.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function downloadCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const participants = await Participant.find({ quizId }).sort({ rank: 1, totalScore: -1 });
    const csvContent = ReportService.generateCSVExport(participants);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="QuizArena_${quiz.roomCode}_Results.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

export async function downloadExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const participants = await Participant.find({ quizId }).sort({ rank: 1, totalScore: -1 });
    const excelBuffer = ReportService.generateExcelExport(quiz, participants);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="QuizArena_${quiz.roomCode}_Results.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}
