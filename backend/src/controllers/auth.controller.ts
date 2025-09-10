// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { validateInitData } from '../services/telegram-auth.service';
import { findOrCreateUser } from '../services/user.service';
import { generateToken } from '../services/jwt.service';

export async function authInit(req: Request, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    // Валидация данных от Telegram
    const telegramUser = await validateInitData(initData);

    // Поиск или создание пользователя в БД
    const user = await findOrCreateUser(telegramUser);

    // Генерация JWT токена
    const token = generateToken(user.id);

    // Возвращаем токен и данные пользователя
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        telegramId: user.telegramId,
      },
    });
  } catch (error) {
    console.error('Auth init error:', error);
    
    // Определяем подходящий статус ошибки
    const statusCode = error.message.includes('validation') ? 400 : 500;
    res.status(statusCode).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

// Временный эндпоинт для тестирования (создает уникальных пользователей при каждом вызове)
export const authTest = async (req: Request, res: Response) => {
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

    // Поиск или создание пользователя в БД
    const user = await findOrCreateUser(telegramUser);
    
    // Генерация JWT токена
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        telegramId: user.telegramId.toString()
      },
      message: "Тестовый пользователь создан/найден"
    });
  } catch (error) {
    console.error('Error in auth test:', error);
    res.status(500).json({ message: error.message });
  }
};