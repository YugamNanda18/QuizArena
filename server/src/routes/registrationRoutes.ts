import { Router } from 'express';
import {
  registerStudent,
  getParticipantStatus,
  listParticipantsForQuiz,
  resumeStudentQuiz,
  completeStudentQuiz,
} from '../controllers/registrationController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', registerStudent);
router.post('/register', registerStudent);
router.post('/resume', resumeStudentQuiz);
router.post('/complete', completeStudentQuiz);
router.get('/participant/:participantId', getParticipantStatus);
router.get('/status/:participantId', getParticipantStatus);
router.get('/quiz/:quizId', requireAuth, requireAdmin, listParticipantsForQuiz);

export default router;
