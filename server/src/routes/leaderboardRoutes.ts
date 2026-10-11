import { Router } from 'express';
import { getLeaderboard, getParticipantResult } from '../controllers/leaderboardController';

const router = Router();

router.get('/quiz/:quizId', getLeaderboard);
router.get('/quiz/:quizId/participant/:participantId', getParticipantResult);

export default router;
