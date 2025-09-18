// src/routes/family.routes.ts
import { Router } from 'express';
import { familyController } from '../controllers/family.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, familyController.createFamily);
router.get('/:id/invite', authMiddleware, familyController.generateInvite);
router.post('/join/:inviteCode', authMiddleware, familyController.joinFamily);

export default router;