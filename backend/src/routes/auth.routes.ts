import { Router } from 'express';
import { authInit, testAuth, testHashValidation, telegramWidgetAuth } from '../controllers/auth.controller';

const router = Router();

router.post('/init', authInit);
router.post('/test', testAuth);
router.post('/test-hash', testHashValidation);
// 🆕 ДОБАВЛЕН НОВЫЙ РОУТ ДЛЯ WIDGET
router.post('/telegram-widget', telegramWidgetAuth);

export default router;