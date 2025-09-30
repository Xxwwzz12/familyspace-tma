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
    // Тестовые данные из ваших логов (обновленные)
    const testInitData = 'query_id=AAF8fB4SAAAAAHx8HhLC8JIT&user=%7B%22id%22%3A303987836%2C%22first_name%22%3A%22%D0%95%D0%B3%D0%BE%D1%80%22%2C%22last_name%22%3A%22%D0%93%D1%83%D1%80%D0%B5%D0%B2%D0%B8%D1%87%22%2C%22username%22%3A%22gurevichegor%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F9kb8SZ1ANHlzQmQyHP6pZPKvlwG0fE3jw1ICgS0c4Sg.svg%22%7D&auth_date=1759211779&signature=A8a7ZIkwQFGSG8Z96rTqfzmgVcq2o9GkL7I6WSLxE19hqXwvVhN59Mg9dfom6SBPkvnDlhCi1_rHIGp73pxCCA&hash=8bc3031175fe510023776ac58e5a4e20b02b726fd70d6c72d5a84cd74458829b';
    
    console.log('🧪 ТЕСТИРУЕМ НОВЫЙ АЛГОРИТМ...');
    console.log('📊 Тестовые данные:', testInitData);
    
    const result = await validateInitData(testInitData, { debug: true });
    
    res.json({
      success: true,
      validationResult: result,
      testData: {
        initData: testInitData,
        expectedHash: '8bc3031175fe510023776ac58e5a4e20b02b726fd70d6c72d5a84cd74458829b',
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

/**
 * Аутентификация через Telegram Login Widget
 * POST /api/auth/telegram-widget
 */
export const telegramWidgetAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🌐 Telegram Widget authentication started');
    
    const widgetData = req.body;
    
    // Валидация обязательных полей
    if (!widgetData.id || !widgetData.auth_date || !widgetData.hash) {
      console.error('❌ Missing required fields in widget data:', {
        hasId: !!widgetData.id,
        hasAuthDate: !!widgetData.auth_date,
        hasHash: !!widgetData.hash
      });
      res.status(400).json({ 
        error: 'Missing required fields: id, auth_date, hash' 
      });
      return;
    }

    console.log('📋 Widget data received:', {
      id: widgetData.id,
      first_name: widgetData.first_name,
      username: widgetData.username,
      auth_date: widgetData.auth_date
    });

    // 🔄 ВАЖНО: Здесь нужно реализовать валидацию хэша Telegram Widget
    // Для демо временно пропускаем проверку, но в продакшене ОБЯЗАТЕЛЬНО
    const isHashValid = await validateTelegramWidgetHash(widgetData);
    
    if (!isHashValid) {
      console.error('❌ Telegram Widget hash validation failed');
      res.status(401).json({ error: 'Invalid Telegram widget data' });
      return;
    }

    // Подготовка данных пользователя для findOrCreateUser
    const telegramUser = {
      id: widgetData.id,
      first_name: widgetData.first_name || '',
      last_name: widgetData.last_name || '',
      username: widgetData.username || '',
      photo_url: widgetData.photo_url || '',
      language_code: widgetData.language_code || 'ru',
      allows_write_to_pm: true, // По умолчанию для widget
      is_bot: false
    };

    // Поиск или создание пользователя
    console.log('🔄 Finding or creating user from widget data...');
    const user = await findOrCreateUser(telegramUser);
    console.log('✅ User processed:', user.id);

    // Генерация JWT токена
    const token = generateToken(user.id);

    console.log('✅ Telegram Widget authentication successful');

    res.json({
      token,
      user: {
        id: user.id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        telegramId: user.telegramId.toString()
      }
    });

  } catch (error) {
    console.error('❌ Telegram Widget authentication error:', error);
    
    if (error instanceof Error) {
      console.error('❌ Widget auth error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error during widget authentication',
      details: process.env.NODE_ENV === 'development' && error instanceof Error 
        ? error.message 
        : undefined
    });
  }
};

/**
 * Валидация хэша Telegram Widget данных
 * TODO: Реализовать по документации Telegram
 */
const validateTelegramWidgetHash = async (widgetData: any): Promise<boolean> => {
  try {
    // 🔄 ВРЕМЕННАЯ ЗАГЛУШКА - В ПРОДАКШЕНЕ РЕАЛИЗОВАТЬ ПРОВЕРКУ!
    console.log('⚠️ TEMPORARY: Skipping Telegram Widget hash validation');
    console.log('📊 Widget hash to validate:', widgetData.hash);
    
    // Реальная реализация должна:
    // 1. Сформировать data-check-string из параметров
    // 2. Вычислить секретный ключ из BOT_TOKEN
    // 3. Проверить HMAC-SHA256 подпись
    // 4. Сравнить с полученным hash
    
    return true; // Временное решение для демо
    
  } catch (error) {
    console.error('❌ Widget hash validation error:', error);
    return false;
  }
};