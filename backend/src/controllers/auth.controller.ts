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

// Временный эндпоинт для тестирования хэша с реальными данными
export const testHashValidation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Тестовые данные из ваших логов
    const testInitData = 'query_id=AAF8fB4SAAAAAHx8HhJW4hQa&user=%7B%22id%22%3A303987836%2C%22first_name%22%3A%22%D0%95%D0%B3%D0%BE%D1%80%22%2C%22last_name%22%3A%22%D0%93%D1%83%D1%80%D0%B5%D0%B2%D0%B8%D1%87%22%2C%22username%22%3A%22gurevichegor%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F9kb8SZ1ANHlzQmQyHP6pZPKvlwG0fE3jw1ICgS0c4Sg.svg%22%7D&auth_date=1759203794&signature=kXpYth9_oLVyC8SkG6N9SXP8UDR6R89ywhgWQtz3U6GVPzfBOGXxIh_aNz97pagAEJwcYQfg2BHMca1JU1eDCw&hash=ad3ab0831aeaf35b8f9076fa098c76ad7ef812d9e8eaf9ae16c7467e903d26b1';
    
    console.log('🧪 ТЕСТИРУЕМ НОВЫЙ АЛГОРИТМ...');
    console.log('📊 Тестовые данные:', testInitData);
    
    const result = await validateInitData(testInitData, { debug: true });
    
    res.json({
      success: true,
      validationResult: result,
      testData: {
        initData: testInitData,
        expectedHash: 'ad3ab0831aeaf35b8f9076fa098c76ad7ef812d9e8eaf9ae16c7467e903d26b1',
        algorithm: 'exclude_signature_and_hash'
      }
    });
  } catch (error) {
    console.error('❌ Test hash validation error:', error);
    
    if (error instanceof Error) {
      console.error('❌ Test hash error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    res.status(500).json({ 
      error: 'Test failed',
      details: process.env.NODE_ENV === 'development' && error instanceof Error 
        ? error.message 
        : undefined
    });
  }
};