// backend/src/services/telegram-auth.service.ts
import { AuthDataValidator } from '@telegram-auth/server';
import { TelegramUser } from '../types/telegram';

// Интерфейс для конфигурации
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

export async function validateInitData(initData: string, options: ValidationOptions = {}): Promise<TelegramUser> {
  const { debug = false } = options;

  if (debug) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] raw initData:', initData);
  }

  // Режим разработки (Fallback)
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

  const BOT_TOKEN = validateEnvironmentVariables(debug);

  try {
    if (debug) {
      console.log('🔐 Validating initData via @telegram-auth/server...');
    }

    // 🔧 ПРЕОБРАЗУЕМ QUERY STRING В ПОЛНЫЙ URL
    const fakeUrl = `https://example.com?${initData}`;
    
    if (debug) {
      console.log('📋 Fake URL for validation:', fakeUrl);
    }

    // Создаем валидатор
    const validator = new AuthDataValidator({ botToken: BOT_TOKEN });
    
    // Передаем полный URL вместо query string
    const user = await validator.validate(new URL(fakeUrl));

    if (debug) {
      console.log('✅ Validation result from library:', user);
      console.log('✅ AUTHENTICATION SUCCESSFUL');
    }

    return user;

  } catch (error) {
    if (debug) {
      console.error('❌ Authentication failed:', error);
    }
    
    // Добавляем дополнительную диагностику при ошибке
    if (debug) {
      console.log('🔍 Debug info:');
      console.log('  - BOT_TOKEN length:', BOT_TOKEN.length);
      console.log('  - initData length:', initData.length);
      console.log('  - initData sample:', initData.substring(0, 200) + '...');
    }
    
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Экспорт для тестов
export { validateEnvironmentVariables };