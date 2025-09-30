import { Router } from 'express';
import { authInit, testAuth } from '../controllers/auth.controller';
import { testHashValidation } from '../controllers/auth.controller';

const router = Router();

router.post('/init', authInit);
router.post('/test', testAuth);
router.post('/auth/test-hash', testHashValidation);

export default router;