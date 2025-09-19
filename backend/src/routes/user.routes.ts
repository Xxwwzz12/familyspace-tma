import { Router } from 'express';
import { getCurrentUser } from '../controllers/user.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, (req, res) => {
    getCurrentUser(req as AuthRequest, res);
});

export default router;