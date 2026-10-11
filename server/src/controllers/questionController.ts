import { Request, Response, NextFunction } from 'express';
import { Question } from '../models/Question';
import { Quiz } from '../models/Quiz';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { createQuestionSchema, bulkUpdatePointsSchema } from '../validators/schemas';

async function recalculateQuizMetrics(quizId: any): Promise<void> {
  const questions = await Question.find({ quizId });
  const totalQuestions = questions.length;
  const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  await Quiz.findByIdAndUpdate(quizId, { totalQuestions, maxScore });
}

export async function getQuestionsForQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const isAdmin = req.user?.role === 'admin';

    // Check if unauthorized student is trying to access protected questions early
    if (!isAdmin) {
      if (quiz.status === 'DRAFT' || quiz.status === 'PUBLISHED' || quiz.status === 'WAITING') {
        throw new AppError('Assessment questions are protected and not accessible before the test starts.', 403);
      }
    }

    const questions = await Question.find({ quizId }).sort({ order: 1, createdAt: 1 });

    // If student and quiz is LIVE, strip correctOptionIndex and explanation
    if (!isAdmin && quiz.status === 'LIVE') {
      const sanitized = questions.map((q) => ({
        _id: q._id,
        quizId: q.quizId,
        text: q.text,
        type: q.type,
        options: q.options,
        points: q.points,
        negativeMarks: q.negativeMarks,
        order: q.order,
        imageUrl: q.imageUrl,
        isRequired: q.isRequired !== false,
      }));
      res.json({ success: true, questions: sanitized });
      return;
    }

    res.json({ success: true, questions });
  } catch (error) {
    next(error);
  }
}

export async function createQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    if (quiz.status === 'LIVE' || quiz.status === 'COMPLETED') {
      throw new AppError('Cannot add questions while quiz is LIVE or COMPLETED', 400);
    }

    const data = createQuestionSchema.parse(req.body);
    const count = await Question.countDocuments({ quizId });

    const question = new Question({
      ...data,
      quizId,
      order: data.order ?? count + 1,
    });

    await question.save();
    await recalculateQuizMetrics(quizId);

    res.status(201).json({ success: true, question });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId);
    if (!question) throw new AppError('Question not found', 404);

    const quiz = await Quiz.findById(question.quizId);
    if (quiz && (quiz.status === 'LIVE' || quiz.status === 'COMPLETED')) {
      throw new AppError('Cannot edit questions while quiz is LIVE or COMPLETED', 400);
    }

    const data = createQuestionSchema.partial().parse(req.body);
    Object.assign(question, data);
    await question.save();

    await recalculateQuizMetrics(question.quizId);

    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
}

export async function bulkUpdatePoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    if (quiz.status === 'LIVE' || quiz.status === 'COMPLETED') {
      throw new AppError('Cannot modify point configuration while quiz is LIVE or COMPLETED', 400);
    }

    const { updates } = bulkUpdatePointsSchema.parse(req.body);

    const bulkOps = updates.map((u) => ({
      updateOne: {
        filter: { _id: u.questionId, quizId },
        update: { $set: { points: u.points } },
      },
    }));

    if (bulkOps.length > 0) {
      await Question.bulkWrite(bulkOps);
    }

    await recalculateQuizMetrics(quizId);

    const updatedQuestions = await Question.find({ quizId }).sort({ order: 1 });
    res.json({ success: true, questions: updatedQuestions });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId);
    if (!question) throw new AppError('Question not found', 404);

    const quizId = question.quizId;
    await Question.findByIdAndDelete(questionId);
    await recalculateQuizMetrics(quizId);

    res.json({ success: true, message: 'Question removed successfully' });
  } catch (error) {
    next(error);
  }
}
