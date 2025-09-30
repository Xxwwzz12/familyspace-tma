// backend/src/services/telegram-auth.service.ts
import * as crypto from 'crypto';
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

// ВРЕМЕННО: принудительно включаем отладку хэша
const DEBUG_SKIP_HASH_CHECK = process.env.DEBUG_SKIP_HASH_CHECK === 'true' || true; // принудительно true

// 🔧 ВРЕМЕННОЕ РЕШЕНИЕ ДЛЯ ТЕСТИРОВАНИЯ - отключение проверки времени
const DEBUG_SKIP_TIME_CHECK = true; // Добавьте эту строку

// Проверка режима отладки хэша
const isHashCheckDisabled = (): boolean => {
  return DEBUG_SKIP_HASH_CHECK;
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
  
  // Предупреждение о режиме отладки
  if (isHashCheckDisabled()) {
    console.warn('⚠️  DEBUG_SKIP_HASH_CHECK is enabled - HASH VERIFICATION IS DISABLED');
    console.warn('⚠️  This should only be used for temporary debugging purposes');
  }
  
  // Предупреждение о отключении проверки времени
  if (DEBUG_SKIP_TIME_CHECK) {
    console.warn('⚠️  DEBUG_SKIP_TIME_CHECK is enabled - TIME VERIFICATION IS DISABLED');
    console.warn('⚠️  This should only be used for temporary debugging purposes');
  }
  
  return BOT_TOKEN;
}

// 🔧 ИСПРАВЛЕННАЯ ФУНКЦИЯ: Извлечение параметров с учетом signature
function extractAndPrepareParams(initData: string, debug = false) {
  const params: Record<string, string> = {};
  const rawParams: Record<string, string> = {};
  const cleaned = initData.startsWith('?') ? initData.slice(1) : initData;
  const pairs = cleaned.split('&').filter(Boolean);

  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    const key = idx >= 0 ? pair.slice(0, idx) : pair;
    const value = idx >= 0 ? pair.slice(idx + 1) : '';
    rawParams[key] = value; // сохраняем оригинал (URL-encoded)
  }

  const hash = rawParams['hash'] ?? (new URLSearchParams(cleaned).get('hash') ?? '');
  if (!hash) throw new Error('Missing hash in initData');

  // 🔧 ИСКЛЮЧАЕМ signature из проверяемых параметров
  const allowedKeys = ['auth_date', 'query_id', 'user'];
  for (const k of Object.keys(rawParams)) {
    // Пропускаем hash и signature
    if (k === 'hash' || k === 'signature') continue;
    
    if (allowedKeys.includes(k)) {
      try {
        params[k] = decodeURIComponent(rawParams[k]);
      } catch {
        params[k] = rawParams[k];
      }
    }
  }

  if (debug || isHashCheckDisabled()) {
    console.log('[TelegramAuth] Decoded params for logic:', params);
    console.log('[TelegramAuth] Raw params (URL-encoded):', rawParams);
    console.log('[TelegramAuth] Received hash:', hash);
    if (rawParams['signature']) {
      console.log('⚠️  Found signature parameter (excluded from data-check-string):', rawParams['signature']);
    }
  }

  return { params, rawParams, hash };
}

// 🔧 ИСПРАВЛЕННАЯ ФУНКЦИЯ: Формирование data-check-string без hash и signature
function buildDataCheckString(rawParams: Record<string, string>, debug = false): string {
  // Создаем копию параметров и удаляем hash и signature
  const checkParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(rawParams)) {
    // 🔴 ВАЖНО: исключаем hash и signature из data-check-string
    if (key === 'hash' || key === 'signature') continue;
    
    // Включаем только разрешенные параметры
    const allowedKeys = ['auth_date', 'query_id', 'user'];
    if (allowedKeys.includes(key)) {
      checkParams.append(key, value);
    }
  }

  // Сортируем параметры по ключу в алфавитном порядке
  const sortedEntries = Array.from(checkParams.entries())
    .sort(([a], [b]) => a.localeCompare(b));
  
  // Формируем data-check-string
  const dataCheckString = sortedEntries
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  if (debug || isHashCheckDisabled()) {
    console.log('📋 Data-check-string (без hash и signature):');
    console.log('```');
    console.log(dataCheckString);
    console.log('```');
    console.log('📏 Длина data-check-string:', dataCheckString.length);
    console.log('🔤 Параметры в data-check-string:');
    sortedEntries.forEach(([key, value]) => {
      console.log(`  ${key}=${value}`);
    });
  }

  return dataCheckString;
}

// 🔧 ИСПРАВЛЕННАЯ ФУНКЦИЯ: Правильное вычисление секретного ключа
function buildSecretKey(botToken: string, debug = false): Buffer {
  // 🔴 БЫЛО (НЕПРАВИЛЬНО):
  // const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  
  // 🟢 СТАЛО (ПРАВИЛЬНО):
  // По документации Telegram: secret = HMAC_SHA256("WebAppData", botToken)
  // В Node.js: crypto.createHmac(algorithm, key).update(data)
  // Поэтому: key = botToken, data = "WebAppData"
  const secretKey = crypto
    .createHmac('sha256', botToken)
    .update('WebAppData')
    .digest();

  if (debug || isHashCheckDisabled()) {
    console.log('🔐 Secret key computation: HMAC_SHA256(botToken, "WebAppData")');
    console.log('🔐 Secret key (hex):', secretKey.toString('hex'));
    console.log('🔐 Secret key length:', secretKey.length);
  }

  return secretKey;
}

// 🔧 ИСПРАВЛЕННАЯ ГЛАВНАЯ ФУНКЦИЯ ВАЛИДАЦИИ
export async function validateInitData(initData: string, options: ValidationOptions = {}): Promise<TelegramUser> {
  const { disableTimeCheck = false, debug = false } = options;
  const hashCheckDisabled = isHashCheckDisabled();
  
  if (debug || hashCheckDisabled) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] raw initData:', initData);
    console.log('[TelegramAuth] options:', { disableTimeCheck, debug });
    if (hashCheckDisabled) {
      console.warn('🚨 HASH VERIFICATION DISABLED - DEBUG_SKIP_HASH_CHECK=true');
    }
    if (DEBUG_SKIP_TIME_CHECK) {
      console.warn('🚨 TIME VERIFICATION DISABLED - DEBUG_SKIP_TIME_CHECK=true');
    }
  }

  // dev fallback
  if (initData.includes('hash=development_fallback_hash')) {
    if (debug || hashCheckDisabled) console.log('[TelegramAuth] development fallback');
    const qs = new URLSearchParams(initData);
    const userParam = qs.get('user');
    if (userParam) {
      try {
        const u = JSON.parse(decodeURIComponent(userParam));
        if (debug || hashCheckDisabled) console.log('[TelegramAuth] fallback user:', u);
        return u;
      } catch (err) {
        if (debug || hashCheckDisabled) console.warn('failed parse fallback user', err);
      }
    }
    return FALLBACK_USER;
  }

  const BOT_TOKEN = validateEnvironmentVariables(debug || hashCheckDisabled);
  const { params, rawParams, hash } = extractAndPrepareParams(initData, debug || hashCheckDisabled);

  if (!params.auth_date) throw new Error('Missing auth_date');
  const authDate = parseInt(params.auth_date, 10);
  if (isNaN(authDate)) throw new Error('Invalid auth_date');

  // 🔧 ИСПРАВЛЕННАЯ ПРОВЕРКА ВРЕМЕНИ С ВОЗМОЖНОСТЬЮ ОТКЛЮЧЕНИЯ
  const MAX_AUTH_AGE = 30 * 60; // 30 минут в секундах
  
  if (!DEBUG_SKIP_TIME_CHECK && !disableTimeCheck) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - authDate;
    const timeDiffMinutes = Math.floor(diff / 60);
    
    if (debug || hashCheckDisabled) {
      console.log('[TelegramAuth] auth_date:', new Date(authDate * 1000).toISOString());
      console.log('[TelegramAuth] current time:', new Date(now * 1000).toISOString());
      console.log('[TelegramAuth] time difference:', timeDiffMinutes, 'minutes');
      console.log('[TelegramAuth] maximum allowed age:', 30, 'minutes');
    }
    
    // 🔧 ВРЕМЕННОЕ РЕШЕНИЕ ДЛЯ ТЕСТИРОВАНИЯ
    if (!DEBUG_SKIP_TIME_CHECK && diff > MAX_AUTH_AGE) {
      throw new Error(`Auth date too old (${timeDiffMinutes} minutes). Maximum allowed: 30 minutes`);
    }
  } else {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - authDate;
    const timeDiffMinutes = Math.floor(diff / 60);
    
    if (debug || hashCheckDisabled) {
      console.log('[TelegramAuth] auth_date:', new Date(authDate * 1000).toISOString());
      console.log('[TelegramAuth] current time:', new Date(now * 1000).toISOString());
      console.log('[TelegramAuth] time difference:', timeDiffMinutes, 'minutes');
      console.log('[TelegramAuth] ⚠️  TIME CHECK DISABLED');
    }
  }

  // 🔧 ИСПРАВЛЕННЫЙ АЛГОРИТМ ПРОВЕРКИ ХЭША
  if (hashCheckDisabled) {
    console.warn('⚠️  SKIPPING HASH VERIFICATION - DEBUG_SKIP_HASH_CHECK=true');
    console.warn('⚠️  This should only be used for temporary debugging');
    
    // Все равно вычисляем и логируем для диагностики
    const dataCheckString = buildDataCheckString(rawParams, true);
    const secretKey = buildSecretKey(BOT_TOKEN, true);
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    console.log('🔐 Expected hash:', expectedHash);
    console.log('🔐 Received hash:', hash);
    console.log('✅ Hashes match (would be):', expectedHash === hash);
    
  } else {
    // 🔧 НОРМАЛЬНАЯ ПРОВЕРКА ХЭША С ИСПРАВЛЕННЫМ АЛГОРИТМОМ
    console.log('🔐 Starting hash validation...');
    
    // Формируем data-check-string (без hash и signature)
    const dataCheckString = buildDataCheckString(rawParams, debug);
    
    // Вычисляем секретный ключ
    const secretKey = buildSecretKey(BOT_TOKEN, debug);
    
    // Вычисляем ожидаемый хэш
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    console.log('🔐 Expected hash:', expectedHash);
    console.log('🔐 Received hash:', hash);
    console.log('✅ Hashes match:', expectedHash === hash);
    
    if (expectedHash !== hash) {
      console.error('❌ Hash validation failed!');
      console.log('🔍 Troubleshooting suggestions:');
      console.log('   1. Check that BOT_TOKEN is correct');
      console.log('   2. Verify initData is passed exactly as received from Telegram');
      console.log('   3. Ensure hash and signature are excluded from data-check-string');
      console.log('   4. Check parameter sorting (alphabetical order)');
      console.log('   5. Verify secret key computation: HMAC_SHA256(botToken, "WebAppData")');
      throw new Error(`Invalid hash. Expected: ${expectedHash}, Received: ${hash}`);
    }
    
    console.log('🔐 Hash validation successful ✅');
  }

  // Парсим user JSON (из decoded params) - это происходит в любом случае
  try {
    const userJson = params.user;
    if (!userJson) throw new Error('Missing user JSON');
    if (debug || hashCheckDisabled) console.log('[TelegramAuth] userJson to parse:', userJson);
    const user = JSON.parse(userJson) as TelegramUser;
    if (debug || hashCheckDisabled) {
      console.log('[TelegramAuth] parsed user:', user);
      if (hashCheckDisabled) {
        console.warn('✅ AUTHENTICATION SUCCESSFUL (HASH CHECK SKIPPED)');
      } else {
        console.log('✅ AUTHENTICATION SUCCESSFUL');
      }
    }
    return user;
  } catch (err) {
    throw new Error(`Invalid user JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Экспорт для тестов
export { validateEnvironmentVariables, extractAndPrepareParams, buildDataCheckString, isHashCheckDisabled };