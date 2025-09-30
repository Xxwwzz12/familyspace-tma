// backend/src/services/telegram-auth.service.ts
import { verifyWebAppData } from 'telegram-webapp-auth';
import { TelegramUser } from '../types/telegram';

// Интерфейс для конфигурации
interface ValidationOptions {
  disableTimeCheck?: boolean;
  debug?: boolean;
}

// Фолбэк-пользователь для dev
const FALLBACK_USER: TelegramUser = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  language_code: 'en',
  is_premium: true,
  allows_write_to_pm: true
};

function validateEnvironmentVariables(debug = false): string {
  if (!process.env.BOT_TOKEN) {
    if (debug) console.error('❌ BOT_TOKEN not set');
    const envKeys = Object.keys(process.env).sort();
    if (debug) console.log('📋 Available env:', envKeys.join(', '));
    throw new Error('BOT_TOKEN is not set in environment variables');
  }
  const BOT_TOKEN = process.env.BOT_TOKEN.trim();
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN is empty or whitespace');
  if (!BOT_TOKEN.match(/^\d+:[a-zA-Z0-9_-]+$/)) {
    if (debug) console.error('❌ BOT_TOKEN has unexpected format');
    throw new Error('Invalid BOT_TOKEN format. Expected "number:secret"');
  }
  if (debug) {
    const masked = BOT_TOKEN.substring(0, 5) + '...' + BOT_TOKEN.substring(BOT_TOKEN.length - 5);
    console.log('✅ BOT_TOKEN (masked):', masked, 'len=', BOT_TOKEN.length);
  }
  
  return BOT_TOKEN;
}

// 🔧 ОСНОВНАЯ ФУНКЦИЯ ВАЛИДАЦИИ С ИСПОЛЬЗОВАНИЕМ БИБЛИОТЕКИ
export async function validateInitData(initData: string, options: ValidationOptions = {}): Promise<TelegramUser> {
  const { debug = false } = options;
  
  if (debug) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] raw initData:', initData);
  }

  // dev fallback
  if (initData.includes('hash=development_fallback_hash')) {
    if (debug) console.log('[TelegramAuth] development fallback detected');
    const qs = new URLSearchParams(initData);
    const userParam = qs.get('user');
    if (userParam) {
      try {
        const u = JSON.parse(decodeURIComponent(userParam));
        if (debug) console.log('[TelegramAuth] fallback user:', u);
        return u;
      } catch (err) {
        if (debug) console.warn('failed parse fallback user', err);
      }
    }
    return FALLBACK_USER;
  }

  const BOT_TOKEN = validateEnvironmentVariables(debug);

  try {
    if (debug) {
      console.log('🔐 Проверка через библиотеку telegram-webapp-auth...');
    }
    
    // Используем библиотеку для проверки
    const isValid = verifyWebAppData(BOT_TOKEN, initData);
    
    if (debug) {
      console.log('✅ Результат проверки библиотекой:', isValid);
    }
    
    if (isValid) {
      // Парсим пользовательские данные вручную из initData
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');
      
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam)) as TelegramUser;
        if (debug) {
          console.log('✅ Пользовательские данные извлечены:', userData);
          console.log('✅ AUTHENTICATION SUCCESSFUL');
        }
        return userData;
      } else {
        throw new Error('Параметр user не найден в initData');
      }
    } else {
      throw new Error('Проверка хэша не пройдена');
    }
  } catch (error) {
    if (debug) {
      console.error('❌ Ошибка при проверке через библиотеку:', error);
    }
    throw new Error(`Ошибка аутентификации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

// Экспорт для тестов
export { validateEnvironmentVariables };