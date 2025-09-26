// backend/src/services/telegram-auth.service.ts
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

// Валидация и чтение BOT_TOKEN из окружения
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

// Извлечение параметров: возвращаем два набора - decoded для логики и raw для формирования data-check-string
function extractAndPrepareParams(initData: string, debug: boolean = false): {
  params: Record<string, string>;
  rawParams: Record<string, string>;
  hash: string;
} {
  const params: Record<string, string> = {};
  const rawParams: Record<string, string> = {};

  const cleaned = initData.startsWith('?') ? initData.slice(1) : initData;
  const pairs = cleaned.split('&').filter(Boolean);

  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    const key = eqIndex >= 0 ? pair.slice(0, eqIndex) : pair;
    const value = eqIndex >= 0 ? pair.slice(eqIndex + 1) : '';
    rawParams[key] = value; // сохраняем оригинальное URL-encoded значение
  }

  const hash = rawParams['hash'] ?? (new URLSearchParams(cleaned).get('hash') ?? '');
  if (!hash) throw new Error('Missing hash parameter in initData');

  const allowedKeys = ['auth_date', 'query_id', 'user'];
  for (const key of Object.keys(rawParams)) {
    if (!allowedKeys.includes(key) || key === 'hash') continue;
    const rawValue = rawParams[key];
    try {
      params[key] = decodeURIComponent(rawValue);
    } catch (err) {
      if (debug) console.warn(`[TelegramAuth] Failed to decode parameter ${key}, using raw value`);
      params[key] = rawValue;
    }
  }

  if (debug) {
    console.log('[TelegramAuth] Extracted parameters (DECODED for logic):');
    Object.entries(params).forEach(([k, v]) => console.log(`  ${k}:`, v));
    console.log('[TelegramAuth] Extracted parameters (RAW - original URL-encoded values):');
    Object.entries(rawParams).forEach(([k, v]) => console.log(`  ${k}:`, v));
    console.log('[TelegramAuth] Hash (from raw params):', hash);
  }

  return { params, rawParams, hash };
}

// Формирует data-check-string из rawParams (включает только whitelist полей + опционально signature)
// Использует ОРИГИНАЛЬНЫЕ (URL-encoded) значения без decodeURIComponent
function buildDataCheckStringFromRaw(rawParams: Record<string, string>, includeSignature: boolean, debug: boolean = false): string {
  const whitelist = new Set(['auth_date', 'query_id', 'user']);
  const entries: Array<[string, string]> = [];

  for (const [k, v] of Object.entries(rawParams)) {
    if (k === 'hash') continue;
    if (!whitelist.has(k) && !(includeSignature && k === 'signature')) continue;
    entries.push([k, v]);
  }

  const sorted = entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');

  if (debug) {
    console.log(`🔐 Data-check-string (includeSignature=${includeSignature}):`);
    console.log(dataCheckString);
    console.log('📏 Data-check-string length:', dataCheckString.length);
    console.log('[TelegramAuth] Sorted parameters for data-check-string:');
    sorted.forEach(([k, v]) => console.log(`  ${k}=${v}`));
  }

  return dataCheckString;
}

// Главная функция проверки initData
export async function validateInitData(initData: string, options: ValidationOptions = {}): Promise<TelegramUser> {
  const { disableTimeCheck = false, debug = false } = options;

  if (debug) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] Raw initData received:', initData);
    console.log('[TelegramAuth] Validation options:', { disableTimeCheck, debug });
  }

  // fallback dev mode
  if (initData.includes('hash=development_fallback_hash')) {
    if (debug) console.log('[TelegramAuth] Development fallback mode detected');
    const paramsQs = new URLSearchParams(initData);
    const userParam = paramsQs.get('user');
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        if (debug) console.log('[TelegramAuth] Using provided user data from fallback:', userData);
        return userData;
      } catch (err) {
        if (debug) console.warn('[TelegramAuth] Failed to parse user data in fallback mode, using default');
      }
    }
    if (debug) console.log('[TelegramAuth] Returning fallback user:', FALLBACK_USER);
    return FALLBACK_USER;
  }

  // BOT_TOKEN
  const BOT_TOKEN = validateEnvironmentVariables(debug);

  // Extract params
  const { params, rawParams, hash } = extractAndPrepareParams(initData, debug);

  if (!params.auth_date) throw new Error('Missing auth_date parameter in initData');
  const authDate = parseInt(params.auth_date, 10);
  if (isNaN(authDate)) throw new Error('Invalid auth_date format. Expected UNIX timestamp');

  if (!disableTimeCheck) {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;
    const timeDiffMinutes = Math.floor(timeDiff / 60);
    if (debug) {
      console.log('[TelegramAuth] Auth date:', new Date(authDate * 1000).toISOString());
      console.log('[TelegramAuth] Current time:', new Date(currentTime * 1000).toISOString());
      console.log('[TelegramAuth] Time difference:', timeDiffMinutes, 'minutes');
    }
    if (timeDiff > 30 * 60) throw new Error(`Auth date is too old (${timeDiffMinutes} minutes). Maximum allowed: 30 minutes`);
  } else if (debug) {
    console.log('[TelegramAuth] Time validation disabled');
  }

  // Подготовим кандидатов секретного ключа: два варианта
  const secretInputA = 'WebAppData' + BOT_TOKEN; // вариант A (часто используемый для WebApp)
  const secretInputB = BOT_TOKEN; // вариант B (иногда используется)
  const secretA = crypto.createHash('sha256').update(secretInputA).digest(); // Buffer
  const secretB = crypto.createHash('sha256').update(secretInputB).digest(); // Buffer

  if (debug) {
    console.log('🔑 Secret key input A:', secretInputA);
    console.log('🔑 Secret key input A length:', secretInputA.length);
    console.log('🔑 Secret key A (hex):', secretA.toString('hex'));
    console.log('🔑 Secret key input B (BOT_TOKEN): [hidden]');
    console.log('🔑 Secret key B (hex):', secretB.toString('hex'));

    try {
      const altKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest('hex');
      console.log('🔑 Alternative secret key calculation (HMAC(WebAppData, BOT_TOKEN)):', altKey);
    } catch (err) {
      if (debug) console.warn('[TelegramAuth] Alternative secret key calculation failed:', err);
    }
  }

  // Попробуем все комбинации: includeSignature true/false × secretA/secretB
  type Candidate = { includeSignature: boolean; secretName: string; dcs: string; hash: string };
  const candidates: Candidate[] = [];

  for (const includeSig of [true, false]) {
    const dcs = buildDataCheckStringFromRaw(rawParams, includeSig, debug);

    const hA = crypto.createHmac('sha256', secretA).update(dcs).digest('hex');
    const hB = crypto.createHmac('sha256', secretB).update(dcs).digest('hex');

    candidates.push({ includeSignature: includeSig, secretName: 'WebAppData+BOT_TOKEN (SHA256)', dcs, hash: hA });
    candidates.push({ includeSignature: includeSig, secretName: 'BOT_TOKEN (SHA256)', dcs, hash: hB });
  }

  if (debug) {
    console.log('[TelegramAuth] Computed candidate hashes:');
    candidates.forEach((c, i) => {
      console.log(`  Candidate ${i + 1}: includeSignature=${c.includeSignature}, secret=${c.secretName}, hash=${c.hash}`);
    });
  }

  const matching = candidates.find(c => c.hash === hash);

  if (!matching) {
    if (debug) {
      console.log('[TelegramAuth] No candidate matched the received hash. Dumping candidates for analysis...');
      candidates.forEach((c, i) => {
        console.log(`--- Candidate ${i + 1} ---`);
        console.log('includeSignature:', c.includeSignature);
        console.log('secret:', c.secretName);
        console.log('calculated hash:', c.hash);
        console.log('DCS (first 500 chars):');
        console.log(c.dcs.slice(0, 500));
      });
    }
    throw new Error(`Invalid hash. None of the computed variants matched the received hash (${hash}).`);
  }

  if (debug) {
    console.log('[TelegramAuth] Selected matching variant:');
    console.log('  includeSignature:', matching.includeSignature);
    console.log('  secret:', matching.secretName);
    console.log('  calculated hash:', matching.hash);
    console.log('[TelegramAuth] Hash validation successful ✅');
  }

  // Парсим user JSON (используем decoded params.user)
  try {
    const userJson = params.user;
    if (!userJson) throw new Error('Missing user data in initData');

    if (debug) console.log('[TelegramAuth] User JSON to parse:', userJson);
    const user = JSON.parse(userJson) as TelegramUser;

    if (debug) console.log('[TelegramAuth] Parsed user data:', user);
    if (debug) console.log('=== TELEGRAM AUTH DEBUG END ===');

    return user;
  } catch (err) {
    throw new Error(`Invalid user data: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Экспорт вспомогательных функций для тестирования
export {
  validateEnvironmentVariables,
  extractAndPrepareParams,
  buildDataCheckStringFromRaw
};
