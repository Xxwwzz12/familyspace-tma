// frontend/src/hooks/useTelegram.ts
import { safeWebApp } from '@/utils/initTelegramSDK';

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
  // Правильное определение Telegram окружения
  const isTelegramEnv = typeof window.Telegram !== 'undefined' && 
                       typeof window.Telegram.WebApp !== 'undefined' &&
                       window.Telegram.WebApp.initData !== '';

  // Функция для расширения viewport
  const expandViewport = () => {
    if (isTelegramEnv) {
      try {
        // Инициализируем SDK перед использованием
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        console.log('✅ Viewport expanded successfully');
      } catch (error) {
        console.error('expandViewport failed:', error);
      }
    }
  };

  // Получаем данные только если находимся в Telegram
  const initData = isTelegramEnv ? window.Telegram.WebApp.initData : null;
  const userData = isTelegramEnv ? window.Telegram.WebApp.initDataUnsafe.user : null;

  // Логирование для отладки
  console.log('📱 useTelegram hook. isTelegramEnv:', isTelegramEnv);
  console.log('👤 User data:', userData);
  console.log('🔧 Init data:', initData);

  return {
    isTelegramEnv,
    expandViewport,
    initData,
    userData: userData as TelegramUser | null,
    webApp: isTelegramEnv ? window.Telegram.WebApp : null
  };
};

export default useTelegram;