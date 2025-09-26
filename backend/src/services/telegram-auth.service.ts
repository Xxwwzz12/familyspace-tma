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
  if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is not set in environment variables');
    const envKeys = Object.keys(process.env).sort();
    console.log('📋 Available environment variables:', envKeys.join(', '));
    
    const similarVars = envKeys.filter(key => 
      key.includes('BOT') || key.includes('TOKEN') || key.includes('TELEGRAM')
    );
    
    if (similarVars.length > 0) {
      console.log('🔍 Similar environment variables found:', similarVars.join(', '));
    }
    
    throw new Error('BOT_TOKEN is not set in environment variables');
  }
  
  const BOT_TOKEN = process.env.BOT_TOKEN.trim();
  
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is set but empty or contains only whitespace');
    throw new Error('BOT_TOKEN is empty or contains only whitespace');
  }
  
  if (!BOT_TOKEN.match(/^\d+:[a-zA-Z0-9_-]+$/)) {
    console.error('❌ Invalid BOT_TOKEN format');
    const maskedToken = BOT_TOKEN.length > 10 
      ? BOT_TOKEN.substring(0, 10) + '...' 
      : BOT_TOKEN;
    
    console.log('🔒 BOT_TOKEN (masked):', maskedToken);
    console.log('📝 Expected format: "number:secret"');
    
    throw new Error('Invalid BOT_TOKEN format. Expected format: "number:secret"');
  }
  
  if (debug) {
    const maskedToken = BOT_TOKEN.substring(0, 5) + '...' + BOT_TOKEN.substring(BOT_TOKEN.length - 5);
    console.log('✅ BOT_TOKEN is available and valid (masked):', maskedToken);
    console.log('✅ BOT_TOKEN length:', BOT_TOKEN.length);
  } else {
    console.log('✅ BOT_TOKEN is available and valid');
  }
  
  return BOT_TOKEN;
}

// Функция для ручного парсинга initData без автоматического декодирования
function parseInitDataManually(initData: string): URLSearchParams {
  const params = new URLSearchParams();
  const pairs = initData.split('&');
  
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('='); // На случай, если значение содержит '='
    
    if (key && value !== undefined) {
      params.append(key, value);
    }
  }
  
  return params;
}

export async function validateInitData(
  initData: string, 
  options: ValidationOptions = {}
): Promise<TelegramUser> {
  const { disableTimeCheck = false, debug = false } = options;
  
  if (debug) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] Raw initData received:', initData);
    console.log('[TelegramAuth] Validation options:', { disableTimeCheck, debug });
  }

  // Проверка на fallback-режим разработки
  if (initData.includes('hash=development_fallback_hash')) {
    if (debug) {
      console.log('[TelegramAuth] Development fallback mode detected');
    }
    
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (userParam) {
      try {
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
    
    if (debug) {
      console.log('[TelegramAuth] Returning fallback user:', FALLBACK_USER);
    }
    
    return FALLBACK_USER;
  }

  // Проверяем переменные окружения
  const BOT_TOKEN = validateEnvironmentVariables(debug);

  // Используем ручной парсинг для лучшего контроля над кодированием
  const searchParams = parseInitDataManually(initData);

  if (debug) {
    console.log('[TelegramAuth] Parsed parameters:');
    for (const [key, value] of searchParams.entries()) {
      console.log(`  ${key}: ${value}`);
    }
  }

  const hash = searchParams.get('hash');
  if (!hash) {
    throw new Error('Missing hash parameter in initData');
  }

  // Сохраняем копию параметров до удаления hash для отладки
  const allParams = new URLSearchParams(searchParams);
  searchParams.delete('hash');

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

  // Формируем data-check-string с тщательной проверкой
  const entries = Array.from(searchParams.entries());
  
  if (debug) {
    console.log('[TelegramAuth] Parameters before sorting:');
    entries.forEach(([key, value], index) => {
      console.log(`  [${index}] ${key}: ${value}`);
    });
  }
  
  // Сортируем в лексикографическом порядке по ключу
  entries.sort(([a], [b]) => a.localeCompare(b));
  
  if (debug) {
    console.log('[TelegramAuth] Parameters after sorting:');
    entries.forEach(([key, value], index) => {
      console.log(`  [${index}] ${key}: ${value}`);
    });
  }
  
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n');

  if (debug) {
    console.log('[TelegramAuth] Data check string:');
    console.log('```');
    console.log(dataCheckString);
    console.log('```');
    console.log('[TelegramAuth] Data check string length:', dataCheckString.length);
  }

  // Вычисляем секретный ключ
  const secretKeyInput = 'WebAppData' + BOT_TOKEN;
  const secretKey = crypto
    .createHash('sha256')
    .update(secretKeyInput)
    .digest();

  if (debug) {
    console.log('[TelegramAuth] Secret key input:', secretKeyInput);
    console.log('[TelegramAuth] Secret key (hex):', secretKey.toString('hex'));
  }

  // Вычисляем HMAC
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (debug) {
    console.log('[TelegramAuth] === HASH COMPARISON ===');
    console.log('[TelegramAuth] Expected hash:', calculatedHash);
    console.log('[TelegramAuth] Received hash:', hash);
    console.log('[TelegramAuth] Hashes match:', calculatedHash === hash);
    
    // Дополнительная диагностика
    console.log('[TelegramAuth] Hash length comparison:');
    console.log(`  Expected: ${calculatedHash.length} characters`);
    console.log(`  Received: ${hash.length} characters`);
    
    if (calculatedHash !== hash) {
      console.log('[TelegramAuth] Hash mismatch analysis:');
      for (let i = 0; i < Math.max(calculatedHash.length, hash.length); i++) {
        if (calculatedHash[i] !== hash[i]) {
          console.log(`  First difference at position ${i}: expected '${calculatedHash[i]}', got '${hash[i]}'`);
          break;
        }
      }
    }
  }

  // Сравниваем хэши
  if (calculatedHash !== hash) {
    if (debug) {
      console.log('[TelegramAuth] === TROUBLESHOOTING SUGGESTIONS ===');
      console.log('1. Check if BOT_TOKEN matches the one used by the frontend');
      console.log('2. Verify that initData is passed exactly as received from Telegram');
      console.log('3. Ensure no URL encoding/decoding happens between frontend and backend');
      console.log('4. Check parameter order in data-check-string (should be alphabetical)');
      console.log('5. Verify that all parameters are included in the hash calculation');
    }
    
    throw new Error(`Invalid hash. Expected: ${calculatedHash}, Received: ${hash}`);
  }

  if (debug) {
    console.log('[TelegramAuth] Hash validation successful ✅');
  }

  // Парсим данные пользователя
  try {
    const userJson = searchParams.get('user');
    if (!userJson) {
      throw new Error('Missing user data in initData');
    }
    
    if (debug) {
      console.log('[TelegramAuth] Raw user JSON:', userJson);
    }
    
    const user = JSON.parse(userJson) as TelegramUser;
    
    if (debug) {
      console.log('[TelegramAuth] Parsed user data:', user);
      console.log('=== TELEGRAM AUTH DEBUG END ===');
    }
    
    return user;
  } catch (error) {
    throw new Error(`Invalid user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Экспортируем вспомогательные функции для тестирования
export { validateEnvironmentVariables, parseInitDataManually };