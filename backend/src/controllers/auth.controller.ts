// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { validateInitData } from '../services/telegram-auth.service';
import { findOrCreateUser } from '../services/user.service';
import { generateToken } from '../services/jwt.service';

// Основной эндпоинт аутентификации
export const authInit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { initData } = req.body;
    
    console.log('🔐 Auth init started with initData length:', initData?.length);
    console.log('📋 First 100 chars of initData:', initData?.substring(0, 100));
    
    // Проверяем наличие initData
    if (!initData) {
      console.log('❌ Missing initData in request');
      res.status(400).json({ error: 'initData is required' });
      return;
    }
    
    // Проверяем базовый формат initData
    if (!initData.includes('hash=') || !initData.includes('auth_date=')) {
      console.log('❌ Invalid initData format - missing required fields');
      res.status(400).json({ error: 'Invalid initData format' });
      return;
    }
    
    // Валидация данных от Telegram
    console.log('🔄 Validating initData...');
    const telegramUser = await validateInitData(initData, { debug: true });
    console.log('✅ InitData validation successful');
    
    // Создание/получение пользователя
    console.log('🔄 Finding or creating user...');
    const user = await findOrCreateUser(telegramUser);
    console.log('✅ User processing successful, user ID:', user.id);
    
    // Генерация JWT токена
    console.log('🔄 Generating JWT token...');
    const token = generateToken(user.id);
    console.log('✅ Token generation successful');
    
    console.log('✅ Auth init successful for user:', user.id);
    
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
    console.error('❌ Auth init error:', error);
    
    // Детальное логирование ошибки
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        initDataLength: req.body.initData?.length || 0,
        initDataPrefix: req.body.initData?.substring(0, 50) || 'None'
      });
    }
    
    let errorMessage = 'Authentication failed';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Определяем тип ошибки для соответствующего статуса
      if (error.message.includes('validation') || 
          error.message.includes('Invalid') || 
          error.message.includes('signature')) {
        statusCode = 401;
        errorMessage = 'Invalid initData signature';
      } else if (error.message.includes('required') || 
                 error.message.includes('missing') ||
                 error.message.includes('format')) {
        statusCode = 400;
        errorMessage = error.message;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' && error instanceof Error 
        ? error.message 
        : undefined
    });
  }
};

// Эндпоинт для тестирования
export const testAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🧪 Test auth endpoint called');
    
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

    console.log('🔄 Creating test user...');
    const user = await findOrCreateUser(telegramUser);
    const token = generateToken(user.id);
    
    console.log('✅ Test auth successful for user:', user.id);

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
    console.error('❌ Test auth error:', error);
    
    if (error instanceof Error) {
      console.error('❌ Test auth error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({ 
      error: 'Test authentication failed',
      details: process.env.NODE_ENV === 'development' && error instanceof Error 
        ? error.message 
        : undefined
    });
  }
};