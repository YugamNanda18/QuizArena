import { Router } from 'express';
import {
  listQuizzes,
  getQuizById,
  getQuizByRoomCode,
  createQuiz,
  updateQuiz,
  updateQuizStatus,
  duplicateQuiz,
  deleteQuiz,
} from '../controllers/quizController';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { getQuestionsForQuiz } from '../controllers/questionController';

const router = Router();

// Public routes for students
router.get('/room/:roomCode', getQuizByRoomCode);
router.get('/:id', getQuizById);
router.get('/:quizId/questions', optionalAuth, getQuestionsForQuiz);

// Protected Admin routes
router.get('/', requireAuth, requireAdmin, listQuizzes);
router.post('/', requireAuth, requireAdmin, createQuiz);
router.put('/:id', requireAuth, requireAdmin, updateQuiz);
router.patch('/:id/status', requireAuth, requireAdmin, updateQuizStatus);
router.post('/:id/duplicate', requireAuth, requireAdmin, duplicateQuiz);
router.delete('/:id', requireAuth, requireAdmin, deleteQuiz);

export default router;
