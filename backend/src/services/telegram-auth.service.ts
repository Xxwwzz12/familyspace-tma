// src/services/telegram-auth.service.ts
import * as crypto from 'crypto';
import { TelegramUser } from '../types/telegram';

export async function validateInitData(initData: string): Promise<TelegramUser> {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not set');
  }

  // Разбиваем строку на параметры. НЕ декодируем значения!
  const searchParams = new URLSearchParams(initData);

  // Извлекаем хэш и сразу удаляем его из списка параметров для проверки.
  const hash = searchParams.get('hash');
  if (!hash) {
    throw new Error('Missing hash parameter');
  }
  searchParams.delete('hash');

  // Проверяем актуальность auth_date
  const authDateStr = searchParams.get('auth_date');
  if (!authDateStr) {
    throw new Error('Missing auth_date');
  }
  const authDate = parseInt(authDateStr, 10);
  if (isNaN(authDate)) {
    throw new Error('Invalid auth_date');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - authDate;
  if (timeDiff > 30 * 60) {
    throw new Error('Auth date is too old');
  }

  // 1. Формируем data-check-string из ОРИГИНАЛЬНЫХ параметров.
  // Сортируем параметры по ключу в алфавитном порядке.
  const entries = Array.from(searchParams.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  // Собираем строку в формате "key=<value>", где value не декодировано.
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n');

  // 2. Правильно вычисляем секретный ключ.
  // Ключ = SHA256("WebAppData" + BOT_TOKEN)
  const secretKey = crypto
    .createHash('sha256')
    .update('WebAppData' + BOT_TOKEN)
    .digest();

  // 3. Вычисляем хэш от dataCheckString с использованием секретного ключа.
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Сравниваем хэши
  if (calculatedHash !== hash) {
    throw new Error('Invalid hash');
  }

  // Парсим и возвращаем данные пользователя
  try {
    const userJson = searchParams.get('user');
    if (!userJson) {
      throw new Error('Missing user data');
    }
    const user = JSON.parse(userJson) as TelegramUser;
    return user;
  } catch {
    throw new Error('Invalid user data');
  }
}