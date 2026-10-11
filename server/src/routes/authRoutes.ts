import { Router } from 'express';
import { login, getCurrentUser } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/me', requireAuth, getCurrentUser);

export default router;
