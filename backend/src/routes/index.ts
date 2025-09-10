import { Router } from 'express';
import { authInit, authTest } from '../controllers/auth.controller';
import { getCurrentUser } from '../controllers/user.controller';
import { familyController } from '../controllers/family.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const mainRouter = Router();

// Публичные маршруты
mainRouter.post('/auth/init', authInit);
mainRouter.post('/auth/test', authTest);

// Защищенные маршруты (требуют аутентификации)
mainRouter.get('/user/me', authMiddleware, getCurrentUser);

// Маршруты для работы с семьями
mainRouter.post('/families', authMiddleware, familyController.createFamily);
mainRouter.get('/families/:id/invite', authMiddleware, familyController.generateInvite);
mainRouter.post('/families/join/:inviteCode', authMiddleware, familyController.joinFamily);

// Корневой эндпоинт
mainRouter.get('/', (req, res) => {
  res.json({ message: 'FamilySpace API is running!' });
});