// backend/src/controllers/family.controller.ts
import { Response } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import * as familyService from '../services/family.service';

export const familyController = {
  // Создание новой семьи
  createFamily: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log('Create family endpoint called');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      console.log('Request user:', req.user);
      
      const { name } = req.body;
      const userId = req.user?.id;
      
      console.log('Extracted userId:', userId);
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      if (!name) {
        res.status(400).json({ error: 'Family name is required' });
        return;
      }

      console.log('Calling createFamily with:', { userId, name });
      const family = await familyService.createFamily(userId, name);
      
      res.status(201).json(family);
    } catch (error) {
      console.error('Error in createFamily controller:', error);
      res.status(500).json({ error: 'Failed to create family' });
    }
  },

  // Генерация инвайт-кода
  generateInvite: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log('Generate invite endpoint called');
      console.log('Request params:', req.params);
      console.log('Request user:', req.user);
      
      const { id: familyId } = req.params;
      const userId = req.user?.id;
      
      console.log('Extracted userId:', userId, 'familyId:', familyId);
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      if (!familyId) {
        res.status(400).json({ error: 'Family ID is required' });
        return;
      }

      console.log('Calling checkUserIsAdmin with:', { familyId, userId });
      const isAdmin = await familyService.checkUserIsAdmin(familyId, userId);
      
      if (!isAdmin) {
        res.status(403).json({ error: 'Access denied. Admin rights required' });
        return;
      }

      console.log('Calling generateInviteCode with:', { familyId, userId });
      const inviteCode = await familyService.generateInviteCode(familyId, userId);
      
      res.status(200).json({ inviteCode });
    } catch (error) {
      console.error('Error in generateInvite controller:', error);
      res.status(500).json({ error: 'Failed to generate invite code' });
    }
  },

  // Вступление в семью по инвайт-коду
  joinFamily: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log('Join family endpoint called');
      console.log('Request params:', req.params);
      console.log('Request user:', req.user);
      
      const { inviteCode } = req.params;
      const userId = req.user?.id;
      
      console.log('Extracted userId:', userId, 'inviteCode:', inviteCode);
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      if (!inviteCode) {
        res.status(400).json({ error: 'Invite code is required' });
        return;
      }

      console.log('Calling joinFamily with:', { inviteCode, userId });
      const result = await familyService.joinFamily(inviteCode, userId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in joinFamily controller:', error);
      res.status(500).json({ error: 'Failed to join family' });
    }
  }
};

// Валидация входящих данных
export const validateFamily = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Family name must be between 2 and 50 characters')
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s]+$/)
    .withMessage('Family name can only contain letters and spaces')
];

export const validateInviteCode = [
  param('inviteCode')
    .isLength({ min: 10, max: 10 })
    .withMessage('Invite code must be exactly 10 characters')
    .isAlphanumeric()
    .withMessage('Invite code can only contain letters and numbers')
];