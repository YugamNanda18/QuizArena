import { Router } from 'express';
import {
  getQuestionsForQuiz,
  createQuestion,
  updateQuestion,
  bulkUpdatePoints,
  deleteQuestion,
} from '../controllers/questionController';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/quiz/:quizId', optionalAuth, getQuestionsForQuiz);
router.post('/quiz/:quizId', requireAuth, requireAdmin, createQuestion);
router.patch('/quiz/:quizId/bulk-points', requireAuth, requireAdmin, bulkUpdatePoints);
router.put('/:questionId', requireAuth, requireAdmin, updateQuestion);
router.delete('/:questionId', requireAuth, requireAdmin, deleteQuestion);

export default router;
