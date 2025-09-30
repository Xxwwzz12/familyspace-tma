// backend/src/services/telegram-auth.service.ts
import { validateWebAppData } from '@telegram-auth/server';
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

    // Ключевой вызов новой библиотеки
    const isValid = validateWebAppData(BOT_TOKEN, initData);

    if (debug) {
      console.log('✅ Validation result from library:', isValid);
    }

    if (!isValid) {
      throw new Error('InitData hash validation failed');
    }

    // --- 4. Извлечение данных пользователя ---
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) {
      throw new Error('Missing user parameter in initData');
    }

    const user = JSON.parse(decodeURIComponent(userParam)) as TelegramUser;

    if (debug) {
      console.log('✅ User data successfully extracted:', user);
      console.log('✅ AUTHENTICATION SUCCESSFUL');
    }

    return user;

  } catch (error) {
    if (debug) {
      console.error('❌ Authentication failed:', error);
    }
    // Пробрасываем ошибку для обработки на верхнем уровне
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}