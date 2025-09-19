import { Router } from 'express';
import { authInit, testAuth } from '../controllers/auth.controller';

const router = Router();

router.post('/init', authInit);
router.post('/test', testAuth);

export default router;