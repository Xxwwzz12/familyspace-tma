// backend/src/services/telegram-auth.service.ts
import { AuthDataValidator } from '@telegram-auth/server';
import { urlStrToAuthDataMap } from '@telegram-auth/server/utils';
import { TelegramUser } from '../types/telegram';

// Интерфейс для конфигурации (оставляем по желанию)
interface ValidationOptions {
  debug?: boolean;
}

// Фолбэк-пользователь для разработки
const FALLBACK_USER: TelegramUser = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  language_code: 'en',
  is_premium: true,
  allows_write_to_pm: true
};

export async function validateInitData(initData: string, options: ValidationOptions = {}): Promise<TelegramUser> {
  const { debug = false } = options;

  if (debug) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] raw initData:', initData);
  }

  // --- 1. Режим разработки (Fallback) ---
  if (initData.includes('hash=development_fallback_hash')) {
    if (debug) {
      console.log('[TelegramAuth] Development fallback mode detected');
    }
    const qs = new URLSearchParams(initData);
    const userParam = qs.get('user');
    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam)) as TelegramUser;
        if (debug) console.log('[TelegramAuth] Fallback user data used:', user);
        return user;
      } catch (err) {
        if (debug) console.warn('Failed to parse fallback user data, using default', err);
      }
    }
    return FALLBACK_USER;
  }

  // --- 2. Проверка наличия BOT_TOKEN ---
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not set in environment variables');
  }

  // --- 3. Валидация данных через @telegram-auth/server ---
  try {
    if (debug) {
      console.log('🔐 Validating initData via @telegram-auth/server...');
    }

    // Инициализируем валидатор с токеном бота
    const validator = new AuthDataValidator({ botToken: BOT_TOKEN });
    
    // Конвертируем данные из URL в Map
    const data = urlStrToAuthDataMap(initData);
    
    // Проверяем данные
    const user = await validator.validate(data);

    if (debug) {
      console.log('✅ Validation result from library:', user);
      console.log('✅ AUTHENTICATION SUCCESSFUL');
    }

    return user;

  } catch (error) {
    if (debug) {
      console.error('❌ Authentication failed:', error);
    }
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}