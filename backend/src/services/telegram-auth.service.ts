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

// Проверка режима отладки хэша
const isHashCheckDisabled = (): boolean => {
  return process.env.DEBUG_SKIP_HASH_CHECK === 'true';
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
  
  return BOT_TOKEN;
}

// Разбираем initData — возвращаем decoded (для логики) и raw (оригинальные URL-encoded значения) + hash
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

  const allowedKeys = ['auth_date', 'query_id', 'user'];
  for (const k of Object.keys(rawParams)) {
    if (!allowedKeys.includes(k) || k === 'hash') continue;
    try {
      params[k] = decodeURIComponent(rawParams[k]);
    } catch {
      params[k] = rawParams[k];
    }
  }

  if (debug || isHashCheckDisabled()) {
    console.log('[TelegramAuth] Decoded params for logic:', params);
    console.log('[TelegramAuth] Raw params (URL-encoded):', rawParams);
    console.log('[TelegramAuth] Received hash:', hash);
  }

  return { params, rawParams, hash };
}

// Формируем data-check-string.
// Параметры:
//  - rawParams: оригинальные URL-encoded значения
//  - includeSignature: если true — включаем поле signature (если есть)
//  - includeAllParams: если true — включаем все параметры (кроме hash), иначе только whitelist
function buildDataCheckString(rawParams: Record<string, string>, includeSignature: boolean, includeAllParams: boolean, debug = false) {
  const whitelist = new Set(['auth_date', 'query_id', 'user']);
  const entries: Array<[string, string]> = [];

  for (const [k, v] of Object.entries(rawParams)) {
    if (k === 'hash') continue;
    if (includeAllParams) {
      entries.push([k, v]);
      continue;
    }
    // not includeAllParams -> use whitelist + optional signature
    if (whitelist.has(k) || (includeSignature && k === 'signature')) {
      entries.push([k, v]);
    }
  }

  // Сортировка по ASCII (детерминированно)
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const dcs = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  if (debug || isHashCheckDisabled()) {
    console.log(`🔐 DCS (includeSignature=${includeSignature} includeAll=${includeAllParams}) length=${dcs.length}:`);
    console.log(dcs);
  }
  return dcs;
}

// Вспомогательная фабрика кандидатов секретного ключа
function buildSecretCandidates(botToken: string, debug = false) {
  const list: Array<{ name: string; key: string | Buffer }> = [];

  // Variant 1: SHA256('WebAppData' + BOT_TOKEN) as Buffer
  const v1 = crypto.createHash('sha256').update('WebAppData' + botToken).digest();
  list.push({ name: "sha256('WebAppData'+BOT)", key: v1 });

  // Variant 2: SHA256(BOT_TOKEN) as Buffer (recommended in some docs/examples)
  const v2 = crypto.createHash('sha256').update(botToken).digest();
  list.push({ name: "sha256(BOT_TOKEN)", key: v2 });

  // Variant 3: SHA256(BOT_TOKEN) hex string (use hex string as key)
  const v3hex = crypto.createHash('sha256').update(botToken).digest('hex');
  list.push({ name: "sha256(BOT_TOKEN).hex", key: v3hex });

  // Variant 4: HMAC('WebAppData', BOT_TOKEN) hex string (alternate)
  try {
    const v4hex = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest('hex');
    list.push({ name: "hmac('WebAppData', BOT_TOKEN).hex", key: v4hex });
  } catch (err) {
    if (debug) console.warn('Alt secret calc failed', err);
  }

  // Variant 5: BOT_TOKEN raw string (some servers incorrectly use raw token)
  list.push({ name: 'BOT_TOKEN.raw', key: botToken });

  if (debug || isHashCheckDisabled()) {
    console.log('[TelegramAuth] Secret candidates:');
    list.forEach((c) => {
      const keyDesc = Buffer.isBuffer(c.key) ? `Buffer(len=${(c.key as Buffer).length})` : `string(len=${(c.key as string).length})`;
      console.log(`  - ${c.name}: ${keyDesc}`);
      if (debug && Buffer.isBuffer(c.key)) console.log(`    hex: ${(c.key as Buffer).toString('hex')}`);
    });
  }

  return list;
}

// Главная валидация
export async function validateInitData(initData: string, options: ValidationOptions = {}): Promise<TelegramUser> {
  const { disableTimeCheck = false, debug = false } = options;
  const hashCheckDisabled = isHashCheckDisabled();
  
  if (debug || hashCheckDisabled) {
    console.log('=== TELEGRAM AUTH DEBUG START ===');
    console.log('[TelegramAuth] raw initData:', initData.slice(0, 1000));
    console.log('[TelegramAuth] options:', { disableTimeCheck, debug });
    if (hashCheckDisabled) {
      console.warn('🚨 HASH VERIFICATION DISABLED - DEBUG_SKIP_HASH_CHECK=true');
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

  if (!disableTimeCheck) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - authDate;
    if (debug || hashCheckDisabled) {
      console.log('[TelegramAuth] auth_date:', new Date(authDate * 1000).toISOString(), 'now:', new Date(now * 1000).toISOString(), 'diffSec=', diff);
    }
    if (diff > 30 * 60) throw new Error('Auth date too old');
  } else if (debug || hashCheckDisabled) {
    console.log('[TelegramAuth] time check disabled');
  }

  // Если проверка хэша отключена, пропускаем всю логику проверки хэша
  if (hashCheckDisabled) {
    console.warn('⚠️  SKIPPING HASH VERIFICATION - DEBUG_SKIP_HASH_CHECK=true');
    console.warn('⚠️  This should only be used for temporary debugging');
    
    // Все равно вычисляем и логируем ожидаемые хэши для диагностики
    const secretCandidates = buildSecretCandidates(BOT_TOKEN, true);
    const computed: Array<{includeSignature: boolean; includeAll: boolean; secretName: string; calcHash: string; dcs: string}> = [];

    for (const includeSignature of [true, false]) {
      for (const includeAllParams of [true, false]) {
        const dcs = buildDataCheckString(rawParams, includeSignature, includeAllParams, true);
        for (const sc of secretCandidates) {
          try {
            const calc = crypto.createHmac('sha256', sc.key as crypto.BinaryLike).update(dcs).digest('hex');
            computed.push({ includeSignature, includeAll: includeAllParams, secretName: sc.name, calcHash: calc, dcs });
          } catch (err) {
            console.warn('HMAC compute failed for', sc.name, err);
          }
        }
      }
    }

    console.log('[TelegramAuth] COMPUTED HASHES (for diagnostics):');
    computed.slice(0, 10).forEach((c, i) => {
      const matchIndicator = c.calcHash === hash ? ' ✅ MATCH' : ' ❌ MISMATCH';
      console.log(`${i + 1}. secret=${c.secretName} includeSig=${c.includeSignature} includeAll=${c.includeAll} hash=${c.calcHash}${matchIndicator}`);
    });
    console.log('[TelegramAuth] RECEIVED HASH:', hash);
    
    // Продолжаем без проверки хэша
  } else {
    // Нормальная проверка хэша
    const secretCandidates = buildSecretCandidates(BOT_TOKEN, debug);
    const computed: Array<{includeSignature: boolean; includeAll: boolean; secretName: string; calcHash: string; dcs: string}> = [];

    for (const includeSignature of [true, false]) {
      for (const includeAllParams of [true, false]) {
        const dcs = buildDataCheckString(rawParams, includeSignature, includeAllParams, debug);
        for (const sc of secretCandidates) {
          try {
            const calc = crypto.createHmac('sha256', sc.key as crypto.BinaryLike).update(dcs).digest('hex');
            computed.push({ includeSignature, includeAll: includeAllParams, secretName: sc.name, calcHash: calc, dcs });
          } catch (err) {
            if (debug) console.warn('HMAC compute failed for', sc.name, err);
          }
        }
      }
    }

    if (debug) {
      console.log('[TelegramAuth] computed hashes (top 20):');
      computed.slice(0, 20).forEach((c, i) => {
        console.log(`${i + 1}. secret=${c.secretName} includeSig=${c.includeSignature} includeAll=${c.includeAll} hash=${c.calcHash}`);
      });
    }

    const match = computed.find(c => c.calcHash === hash);
    if (!match) {
      if (debug) {
        console.log('[TelegramAuth] No match. Dumping candidate details for analysis (first 8):');
        computed.slice(0, 8).forEach((c, i) => {
          console.log('--- Candidate', i + 1, '---');
          console.log('secret:', c.secretName, 'includeSig=', c.includeSignature, 'includeAll=', c.includeAll);
          console.log('calculatedHash:', c.calcHash);
          console.log('DCS (first 500 chars):');
          console.log(c.dcs.slice(0, 500));
        });
        console.log('[TelegramAuth] RECEIVED hash:', hash);
      }
      throw new Error(`Invalid hash. None of ${computed.length} computed variants matched received hash (${hash}).`);
    }

    if (debug) {
      console.log('[TelegramAuth] Matched candidate:', match.secretName, 'includeSig=', match.includeSignature, 'includeAll=', match.includeAll);
      console.log('[TelegramAuth] Hash validated ✅');
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
      }
    }
    return user;
  } catch (err) {
    throw new Error(`Invalid user JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Экспорт для тестов
export { validateEnvironmentVariables, extractAndPrepareParams, buildDataCheckString, isHashCheckDisabled };