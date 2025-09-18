import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Подключаем все роуты здесь
router.use('/auth', authRoutes);

// Экспортируем основной роутер
export const mainRouter = router;