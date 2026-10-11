import { Router } from 'express';
import authRoutes from './authRoutes';
import quizRoutes from './quizRoutes';
import questionRoutes from './questionRoutes';
import registrationRoutes from './registrationRoutes';
import answerRoutes from './answerRoutes';
import leaderboardRoutes from './leaderboardRoutes';
import exportRoutes from './exportRoutes';
import analyticsRoutes from './analyticsRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/quizzes', quizRoutes);
router.use('/questions', questionRoutes);
router.use('/registration', registrationRoutes);
router.use('/answers', answerRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/export', exportRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
