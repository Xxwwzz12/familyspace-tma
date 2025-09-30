import { Router } from 'express';
import { authInit, testAuth, testHashValidation } from '../controllers/auth.controller';

const router = Router();

router.post('/init', authInit);
router.post('/test', testAuth);
router.post('/test-hash', testHashValidation); // Исправлено: убрано дублирование /auth

export default router;