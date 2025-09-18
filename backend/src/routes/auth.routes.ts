import { Router } from 'express';
import { authInit, testAuth } from '../controllers/auth.controller'; // Измените authTest на testAuth

const router = Router();

router.post('/init', authInit);
router.post('/test', testAuth); // Соответственно измените здесь

export default router;