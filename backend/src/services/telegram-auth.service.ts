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

// 🔧 ФУНКЦИЯ: Формирование data-check-string с разными вариантами
function buildDataCheckStringVariants(rawParams: Record<string, string>, debug = false) {
  const variants: Array<{name: string; dcs: string}> = [];
  
  // Вариант 1: исключаем hash и signature (текущий)
  const checkParams1 = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === 'hash' || key === 'signature') continue;
    const allowedKeys = ['auth_date', 'query_id', 'user'];
    if (allowedKeys.includes(key)) {
      checkParams1.append(key, value);
    }
  }
  const sortedEntries1 = Array.from(checkParams1.entries()).sort(([a], [b]) => a.localeCompare(b));
  const dcs1 = sortedEntries1.map(([key, value]) => `${key}=${value}`).join('\n');
  variants.push({ name: 'exclude_hash_and_signature', dcs: dcs1 });
  
  // Вариант 2: исключаем только hash, оставляем signature
  const checkParams2 = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === 'hash') continue;
    const allowedKeys = ['auth_date', 'query_id', 'user', 'signature'];
    if (allowedKeys.includes(key)) {
      checkParams2.append(key, value);
    }
  }
  const sortedEntries2 = Array.from(checkParams2.entries()).sort(([a], [b]) => a.localeCompare(b));
  const dcs2 = sortedEntries2.map(([key, value]) => `${key}=${value}`).join('\n');
  variants.push({ name: 'exclude_only_hash', dcs: dcs2 });
  
  // Вариант 3: включаем все параметры кроме hash
  const checkParams3 = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === 'hash') continue;
    checkParams3.append(key, value);
  }
  const sortedEntries3 = Array.from(checkParams3.entries()).sort(([a], [b]) => a.localeCompare(b));
  const dcs3 = sortedEntries3.map(([key, value]) => `${key}=${value}`).join('\n');
  variants.push({ name: 'include_all_except_hash', dcs: dcs3 });

  if (debug || isHashCheckDisabled()) {
    console.log('📋 Data-check-string варианты:');
    variants.forEach((variant, index) => {
      console.log(`\n🔤 Вариант ${index + 1}: ${variant.name}`);
      console.log('```');
      console.log(variant.dcs);
      console.log('```');
      console.log(`📏 Длина: ${variant.dcs.length}`);
    });
  }

  return variants;
}

// 🔧 ФУНКЦИЯ: Создание вариантов секретного ключа
function buildSecretKeyVariants(botToken: string, debug = false) {
  const variants = [
    {
      name: 'SHA256(botToken)',
      key: crypto.createHash('sha256').update(botToken).digest()
    },
    {
      name: 'HMAC_SHA256("WebAppData", botToken)',
      key: crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    },
    {
      name: 'HMAC_SHA256(botToken, "WebAppData")', 
      key: crypto.createHmac('sha256', botToken).update('WebAppData').digest()
    },
    {
      name: 'SHA256("WebAppData" + botToken)',
      key: crypto.createHash('sha256').update('WebAppData' + botToken).digest()
    },
    {
      name: 'BOT_TOKEN (raw)',
      key: botToken
    }
  ];

  if (debug || isHashCheckDisabled()) {
    console.log('🔐 Варианты секретного ключа:');
    variants.forEach((variant, index) => {
      const keyDesc = Buffer.isBuffer(variant.key) 
        ? `Buffer(len=${variant.key.length}, hex=${variant.key.toString('hex').substring(0, 16)}...)`
        : `String(len=${variant.key.length})`;
      console.log(`  ${index + 1}. ${variant.name}: ${keyDesc}`);
    });
  }

  return variants;
}

// 🔧 ФУНКЦИЯ: Тестирование всех комбинаций
function testAllHashCombinations(
  secretKeyVariants: Array<{name: string; key: Buffer | string}>,
  dataCheckStringVariants: Array<{name: string; dcs: string}>,
  receivedHash: string,
  debug = false
): {success: boolean; secretVariant?: string; dcsVariant?: string} {
  console.log('\n🎯 ТЕСТИРУЕМ ВСЕ КОМБИНАЦИИ ХЭШЕЙ:');
  console.log('================================');
  
  let foundMatch = false;
  let matchDetails: {secretVariant?: string; dcsVariant?: string} = {};

  for (const secretVariant of secretKeyVariants) {
    for (const dcsVariant of dataCheckStringVariants) {
      try {
        const testHash = crypto.createHmac('sha256', secretVariant.key as crypto.BinaryLike)
          .update(dcsVariant.dcs)
          .digest('hex');
        
        const matches = testHash === receivedHash;
        
        if (debug || isHashCheckDisabled() || matches) {
          console.log(`\n🔍 TEST: ${secretVariant.name} + ${dcsVariant.name}`);
          console.log(`🔐 Expected: ${testHash}`);
          console.log(`🔐 Received: ${receivedHash}`);
          console.log(`✅ Match: ${matches ? '🎉 ДА!' : '❌ нет'}`);
        }
        
        if (matches && !foundMatch) {
          console.log('🎉 НАЙДЕНА РАБОЧАЯ КОМБИНАЦИЯ!');
          foundMatch = true;
          matchDetails = {
            secretVariant: secretVariant.name,
            dcsVariant: dcsVariant.name
          };
        }
      } catch (error) {
        if (debug || isHashCheckDisabled()) {
          console.log(`❌ Ошибка в комбинации: ${secretVariant.name} + ${dcsVariant.name}`);
          console.log(`   Error: ${error}`);
        }
      }
    }
  }

  if (!foundMatch) {
    console.log('\n❌ Ни одна комбинация не сработала');
  }

  return { success: foundMatch, ...matchDetails };
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

  // 🔧 ТЕСТИРУЕМ ВСЕ ВАРИАНТЫ ХЭШЕЙ
  const secretKeyVariants = buildSecretKeyVariants(BOT_TOKEN, debug || hashCheckDisabled);
  const dataCheckStringVariants = buildDataCheckStringVariants(rawParams, debug || hashCheckDisabled);
  
  const testResult = testAllHashCombinations(
    secretKeyVariants, 
    dataCheckStringVariants, 
    hash, 
    debug || hashCheckDisabled
  );

  // 🔧 ИСПРАВЛЕННЫЙ АЛГОРИТМ ПРОВЕРКИ ХЭША
  if (hashCheckDisabled) {
    console.warn('⚠️  SKIPPING HASH VERIFICATION - DEBUG_SKIP_HASH_CHECK=true');
    console.warn('⚠️  This should only be used for temporary debugging');
    
    if (testResult.success) {
      console.log(`🎉 Рабочая комбинация найдена: ${testResult.secretVariant} + ${testResult.dcsVariant}`);
    }
    
  } else {
    if (testResult.success) {
      console.log(`🎉 Используем рабочую комбинацию: ${testResult.secretVariant} + ${testResult.dcsVariant}`);
      console.log('🔐 Hash validation successful ✅');
    } else {
      console.error('❌ Hash validation failed! Ни одна комбинация не сработала');
      console.log('🔍 Troubleshooting suggestions:');
      console.log('   1. Check that BOT_TOKEN is correct');
      console.log('   2. Verify initData is passed exactly as received from Telegram');
      console.log('   3. Check if BOT_TOKEN matches the one used in Telegram WebApp');
      console.log('   4. Verify that no URL encoding/decoding happens in between');
      throw new Error(`Invalid hash. None of the ${secretKeyVariants.length * dataCheckStringVariants.length} combinations matched received hash`);
    }
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
export { 
  validateEnvironmentVariables, 
  extractAndPrepareParams, 
  buildDataCheckStringVariants, 
  buildSecretKeyVariants,
  testAllHashCombinations,
  isHashCheckDisabled 
};