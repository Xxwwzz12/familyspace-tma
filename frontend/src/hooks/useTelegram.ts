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
  // Правильная логика определения нахождения в Telegram
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const isTMA = !!webApp;
  
  // Используем данные из safeWebApp
  const user = safeWebApp.initDataUnsafe?.user as TelegramUser | undefined;

  // Добавляем логирование
  console.log('📱 useTelegram hook. isTMA:', isTMA, 'webApp:', webApp);
  
  // Дополнительное логирование для отладки
  if (isTMA) {
    console.log('✅ Приложение запущено внутри Telegram');
    console.log('👤 Пользователь:', user);
    console.log('🔧 Версия WebApp:', webApp?.version);
    console.log('📱 Платформа:', webApp?.platform);
  } else {
    console.log('🌐 Приложение запущено вне Telegram (браузер)');
  }

  return {
    webApp: safeWebApp,
    user,
    isTMA,
    isInTelegram: isTMA, // для обратной совместимости
    // Вспомогательные методы
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};

export default useTelegram;