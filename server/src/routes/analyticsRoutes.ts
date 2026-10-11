import { Router } from 'express';
import {
  getAdminOverview,
  getQuizAnalytics,
  getAuditLogs,
} from '../controllers/analyticsController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/overview', requireAuth, requireAdmin, getAdminOverview);
router.get('/quiz/:quizId', requireAuth, requireAdmin, getQuizAnalytics);
router.get('/audit-logs', requireAuth, requireAdmin, getAuditLogs);

export default router;
