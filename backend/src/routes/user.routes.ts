// src/routes/user.routes.ts
import { Router } from 'express';
import { getCurrentUser } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getCurrentUser);

export default router;