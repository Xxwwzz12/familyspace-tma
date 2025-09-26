// src/services/telegram-auth.service.ts
import * as crypto from 'crypto';
import { TelegramUser } from '../types/telegram';

// Интерфейс для конфигурации
interface ValidationOptions {
  disableTimeCheck?: boolean;
  debug?: boolean;
}

// Тестовые данные пользователя для fallback-режима
const FALLBACK_USER: TelegramUser = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User', 
  username: 'testuser',
  language_code: 'en',
  is_premium: true,
  allows_write_to_pm: true
};

// Функция для безопасной проверки переменных окружения
function validateEnvironmentVariables(debug: boolean = false): string {
  // Проверяем наличие BOT_TOKEN
  if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is not set in environment variables');
    
    // Логируем доступные переменные окружения (без значений для безопасности)
    const envKeys = Object.keys(process.env).sort();
    console.log('📋 Available environment variables:', envKeys.join(', '));
    
    // Проверяем похожие переменные
    const similarVars = envKeys.filter(key => 
      key.includes('BOT') || key.includes('TOKEN') || key.includes('TELEGRAM')
    );
    
    if (similarVars.length > 0) {
      console.log('🔍 Similar environment variables found:', similarVars.join(', '));
    }
    
    throw new Error('BOT_TOKEN is not set in environment variables');
  }
  
  const BOT_TOKEN = process.env.BOT_TOKEN.trim();
  
  // Проверяем, что токен не пустой после trim()
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is set but empty or contains only whitespace');
    throw new Error('BOT_TOKEN is empty or contains only whitespace');
  }
  
  // Проверяем базовый формат токена (должен быть в формате "число:секрет")
  if (!BOT_TOKEN.match(/^\d+:[a-zA-Z0-9_-]+$/)) {
    console.error('❌ Invalid BOT_TOKEN format');
    
    // Маскируем токен для безопасного логирования (показываем только первые 10 символов)
    const maskedToken = BOT_TOKEN.length > 10 
      ? BOT_TOKEN.substring(0, 10) + '...' 
      : BOT_TOKEN;
    
    console.log('🔒 BOT_TOKEN (masked):', maskedToken);
    console.log('📝 Expected format: "number:secret" (e.g., "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")');
    
    throw new Error('Invalid BOT_TOKEN format. Expected format: "number:secret"');
  }
  
  if (debug) {
    // В debug режиме показываем маскированную версию токена
    const maskedToken = BOT_TOKEN.substring(0, 5) + '...' + BOT_TOKEN.substring(BOT_TOKEN.length - 5);
    console.log('✅ BOT_TOKEN is available and valid (masked):', maskedToken);
    console.log('✅ BOT_TOKEN length:', BOT_TOKEN.length);
  } else {
    console.log('✅ BOT_TOKEN is available and valid');
  }
  
  return BOT_TOKEN;
}

export async function validateInitData(
  initData: string, 
  options: ValidationOptions = {}
): Promise<TelegramUser> {
  const { disableTimeCheck = false, debug = false } = options;
  
  if (debug) {
    console.log('[TelegramAuth] InitData received:', initData);
    console.log('[TelegramAuth] Validation options:', { disableTimeCheck, debug });
  }

  // Проверка на fallback-режим разработки
  if (initData.includes('hash=development_fallback_hash')) {
    if (debug) {
      console.log('[TelegramAuth] Development fallback mode detected');
    }
    
    // Парсим initData чтобы извлечь user, если он есть
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (userParam) {
      try {
        // Пытаемся декодировать и распарсить данные пользователя
        const userData = JSON.parse(decodeURIComponent(userParam));
        
        if (debug) {
          console.log('[TelegramAuth] Using provided user data from fallback:', userData);
        }
        
        return userData;
      } catch (error) {
        if (debug) {
          console.warn('[TelegramAuth] Failed to parse user data in fallback mode, using default');
        }
      }
    }
    
    // Возвращаем тестового пользователя по умолчанию
    if (debug) {
      console.log('[TelegramAuth] Returning fallback user:', FALLBACK_USER);
    }
    
    return FALLBACK_USER;
  }

  // Проверяем переменные окружения с улучшенной диагностикой
  const BOT_TOKEN = validateEnvironmentVariables(debug);

  // Разбиваем строку на параметры. НЕ декодируем значения!
  const searchParams = new URLSearchParams(initData);

  // Извлекаем хэш и сразу удаляем его из списка параметров для проверки.
  const hash = searchParams.get('hash');
  if (!hash) {
    throw new Error('Missing hash parameter in initData');
  }
  searchParams.delete('hash');

  // Проверяем актуальность auth_date
  const authDateStr = searchParams.get('auth_date');
  if (!authDateStr) {
    throw new Error('Missing auth_date parameter in initData');
  }
  
  const authDate = parseInt(authDateStr, 10);
  if (isNaN(authDate)) {
    throw new Error('Invalid auth_date format. Expected UNIX timestamp');
  }

  if (!disableTimeCheck) {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;
    const timeDiffMinutes = Math.floor(timeDiff / 60);
    
    if (debug) {
      console.log('[TelegramAuth] Auth date:', new Date(authDate * 1000).toISOString());
      console.log('[TelegramAuth] Current time:', new Date(currentTime * 1000).toISOString());
      console.log('[TelegramAuth] Time difference:', timeDiffMinutes, 'minutes');
    }
    
    if (timeDiff > 30 * 60) {
      throw new Error(`Auth date is too old (${timeDiffMinutes} minutes). Maximum allowed: 30 minutes`);
    }
  } else if (debug) {
    console.log('[TelegramAuth] Time validation disabled');
  }

  // 1. Формируем data-check-string из ОРИГИНАЛЬНЫХ параметров.
  // Сортируем параметры по ключу в алфавитном порядке.
  const entries = Array.from(searchParams.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  
  // Собираем строку в формате "key=<value>", где value не декодировано.
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n');

  if (debug) {
    console.log('[TelegramAuth] Data check string:', dataCheckString);
    console.log('[TelegramAuth] Entries:', entries);
  }

  // 2. Правильно вычисляем секретный ключ.
  // Ключ = SHA256("WebAppData" + BOT_TOKEN)
  const secretKey = crypto
    .createHash('sha256')
    .update('WebAppData' + BOT_TOKEN)
    .digest();

  // 3. Вычисляем хэш от dataCheckString с использованием секретного ключа.
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (debug) {
    console.log('[TelegramAuth] Expected hash:', calculatedHash);
    console.log('[TelegramAuth] Received hash:', hash);
    console.log('[TelegramAuth] Secret key source:', 'WebAppData' + BOT_TOKEN);
  }

  // Сравниваем хэши
  if (calculatedHash !== hash) {
    throw new Error(`Invalid hash. Expected: ${calculatedHash}, Received: ${hash}. Check BOT_TOKEN and parameter encoding.`);
  }

  if (debug) {
    console.log('[TelegramAuth] Hash validation successful');
  }

  // Парсим и возвращаем данные пользователя
  try {
    const userJson = searchParams.get('user');
    if (!userJson) {
      throw new Error('Missing user data in initData');
    }
    const user = JSON.parse(userJson) as TelegramUser;
    
    if (debug) {
      console.log('[TelegramAuth] User data:', user);
    }
    
    return user;
  } catch (error) {
    throw new Error(`Invalid user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Экспортируем функцию для тестирования
export { validateEnvironmentVariables };