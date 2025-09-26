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

// Функция для извлечения и обработки параметров согласно требованиям Telegram
// ВАЖНО: возвращаем как декодированные параметры (params) для дальнейшей логики,
// так и оригинальные (rawParams) — для формирования data-check-string нужно использовать оригинальные URL-encoded значения.
function extractAndPrepareParams(initData: string, debug: boolean = false): { params: Record<string, string>, rawParams: Record<string, string>, hash: string } {
  const params: Record<string, string> = {};
  const rawParams: Record<string, string> = {};

  // Очищаем возможный ведущий "?"
  const cleaned = initData.startsWith('?') ? initData.slice(1) : initData;

  // Разбираем вручную, чтобы сохранить оригинальные (URL-encoded) значения
  const pairs = cleaned.split('&').filter(Boolean);

  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    const key = eqIndex >= 0 ? pair.slice(0, eqIndex) : pair;
    const value = eqIndex >= 0 ? pair.slice(eqIndex + 1) : '';
    rawParams[key] = value; // оригинальное значение, без decodeURIComponent
  }

  // Получаем hash — предпочитаем оригинальное значение из rawParams
  const hash = rawParams['hash'] ?? (new URLSearchParams(cleaned).get('hash') ?? '');
  if (!hash) {
    throw new Error('Missing hash parameter in initData');
  }

  // Обрабатываем только разрешенные параметры и формируем декодированные значения для логики
  const allowedKeys = ['auth_date', 'query_id', 'user'];

  for (const key of Object.keys(rawParams)) {
    if (!allowedKeys.includes(key) || key === 'hash') continue;

    const rawValue = rawParams[key];
    try {
      // Для внешней логики нам нужны декодированные значения
      params[key] = decodeURIComponent(rawValue);
    } catch (error) {
      if (debug) {
        console.warn(`[TelegramAuth] Failed to decode parameter ${key}, using raw value`);
      }
      params[key] = rawValue;
    }
  }

  if (debug) {
    console.log('[TelegramAuth] Extracted parameters (DECODED for logic):');
    Object.entries(params).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });

    console.log('[TelegramAuth] Extracted parameters (RAW - original URL-encoded values):');
    Object.entries(rawParams).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });

    console.log('[TelegramAuth] Hash (from raw params):', hash);
  }

  return { params, rawParams, hash };
}

// Функция для формирования data-check-string согласно требованиям Telegram
// Важно: использовать оригинальные, НЕ декодированные значения (rawParams)
function buildDataCheckString(rawParams: Record<string, string>, debug: boolean = false): string {
  // Копируем и исключаем hash
  const validParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (k === 'hash') continue;
    validParams[k] = v;
  }

  // Сортируем параметры в алфавитном порядке по ключу
  const sortedEntries = Object.entries(validParams).sort(([a], [b]) => a.localeCompare(b));

  // Формируем строку в формате "key=value" используя ОРИГИНАЛЬНЫЕ закодированные значения
  const dataCheckString = sortedEntries.map(([key, value]) => `${key}=${value}`).join('\n');

  if (debug) {
    console.log('🔐 Data-check-string with ORIGINAL encoded values:');
    console.log(dataCheckString);
    console.log('📏 Data-check-string length:', dataCheckString.length);

    console.log('[TelegramAuth] Sorted parameters for data-check-string:');
    sortedEntries.forEach(([key, value]) => {
      console.log(`  ${key}=${value}`);
    });
  }

  return dataCheckString;
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

  // Извлекаем и подготавливаем параметры согласно требованиям Telegram
  const { params, rawParams, hash } = extractAndPrepareParams(initData, debug);

  // Проверяем обязательные параметры
  if (!params.auth_date) {
    throw new Error('Missing auth_date parameter in initData');
  }
  
  const authDate = parseInt(params.auth_date, 10);
  if (isNaN(authDate)) {
    throw new Error('Invalid auth_date format. Expected UNIX timestamp');
  }

  // Проверка времени
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

  // Формируем data-check-string согласно требованиям Telegram (используем rawParams)
  const dataCheckString = buildDataCheckString(rawParams, debug);

  // Вычисляем секретный ключ
  const secretKeyInput = 'WebAppData' + BOT_TOKEN;
  const secretKey = crypto
    .createHash('sha256')
    .update(secretKeyInput)
    .digest();

  if (debug) {
    console.log('🔑 Secret key input:', secretKeyInput);
    console.log('🔑 Secret key input length:', secretKeyInput.length);
    console.log('🔑 Secret key (hex):', secretKey.toString('hex'));

    // Альтернативный метод проверки (логирование для отладки)
    try {
      const altKey = crypto.createHmac('sha256', 'WebAppData')
        .update(BOT_TOKEN)
        .digest('hex');
      console.log('🔑 Alternative secret key calculation (HMAC(WebAppData, BOT_TOKEN)):', altKey);
    } catch (err) {
      if (debug) console.warn('[TelegramAuth] Alternative secret key calculation failed:', err);
    }
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
      
      console.log('[TelegramAuth] === TROUBLESHOOTING SUGGESTIONS ===');
      console.log('1. Verify BOT_TOKEN matches the one used by Telegram');
      console.log('2. Ensure initData is passed exactly as received from Telegram');
      console.log('3. Check that parameter values are properly URL-encoded (data-check-string uses original encoded values)');
      console.log('4. Verify parameter order in data-check-string (alphabetical)');
      console.log('5. Confirm only allowed parameters are included (auth_date, query_id, user)');
    }
  }

  // Сравниваем хэши
  if (calculatedHash !== hash) {
    throw new Error(`Invalid hash. Expected: ${calculatedHash}, Received: ${hash}`);
  }

  if (debug) {
    console.log('[TelegramAuth] Hash validation successful ✅');
  }

  // Парсим данные пользователя (используем декодированное значение из params)
  try {
    const userJson = params.user;
    if (!userJson) {
      throw new Error('Missing user data in initData');
    }
    
    if (debug) {
      console.log('[TelegramAuth] User JSON to parse:', userJson);
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
export { validateEnvironmentVariables, extractAndPrepareParams, buildDataCheckString };
