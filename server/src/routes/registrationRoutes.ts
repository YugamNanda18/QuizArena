import { Router } from 'express';
import {
  registerStudent,
  getParticipantStatus,
  listParticipantsForQuiz,
} from '../controllers/registrationController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', registerStudent);
router.post('/register', registerStudent);
router.get('/participant/:participantId', getParticipantStatus);
router.get('/status/:participantId', getParticipantStatus);
router.get('/quiz/:quizId', requireAuth, requireAdmin, listParticipantsForQuiz);

export default router;
