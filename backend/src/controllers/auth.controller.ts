// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { validateInitData } from '../services/telegram-auth.service';
import { findOrCreateUser } from '../services/user.service';
import { generateToken } from '../services/jwt.service';

// Основной эндпоинт аутентификации
export const authInit = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received initData:', req.body.initData);
    
    const { initData } = req.body;

    if (!initData) {
      res.status(400).json({ error: 'initData is required' });
      return;
    }

    const telegramUser = await validateInitData(initData, { debug: true });
    const user = await findOrCreateUser(telegramUser);
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        telegramId: user.telegramId.toString(),
      },
    });
  } catch (error) {
    console.error('Auth init error:', error);
    
    // Обработка ошибки с проверкой типа
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      statusCode = error.message.includes('validation') ? 400 : 500;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage
    });
  }
};

// Эндпоинт для тестирования
export const testAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Генерируем случайный telegramId для каждого запроса
    const randomTelegramId = Math.floor(Math.random() * 1000000000);
    
    const telegramUser = {
      id: randomTelegramId,
      first_name: 'Test',
      last_name: 'User' + randomTelegramId.toString().slice(0, 3),
      username: 'testuser' + randomTelegramId.toString().slice(0, 3),
      photo_url: null,
      is_bot: false,
      language_code: 'ru',
      allows_write_to_pm: true
    };

    const user = await findOrCreateUser(telegramUser);
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        telegramId: user.telegramId.toString(),
      }
    });
  } catch (error) {
    console.error('Error in testAuth:', error);
    
    // Обработка ошибки с проверкой типа
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
};