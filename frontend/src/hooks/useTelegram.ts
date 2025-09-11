import { safeWebApp } from '@/utils/initTelegramSDK';
import { isTelegramEnv } from '@/utils/env';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

const useTelegram = () => {
  const user = safeWebApp.initDataUnsafe?.user as TelegramUser | undefined;
  const isInTelegram = isTelegramEnv();

  return {
    webApp: safeWebApp,
    user,
    isInTelegram,
    // Вспомогательные методы
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};

export default useTelegram;