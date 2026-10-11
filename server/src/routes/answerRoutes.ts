import { Router } from 'express';
import { submitAnswer, getSubmittedAnswers } from '../controllers/answerController';

const router = Router();

router.post('/submit', submitAnswer);
router.get('/quiz/:quizId/participant/:participantId', getSubmittedAnswers);

export default router;
