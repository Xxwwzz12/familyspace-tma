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
  // Правильная логика определения нахождения в Telegram
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const isTMA = !!webApp;
  
  // Используем данные из safeWebApp
  const user = safeWebApp.initDataUnsafe?.user as TelegramUser | undefined;

  // Добавляем логирование
  console.log('📱 useTelegram hook. isTMA:', isTMA, 'webApp:', webApp);
  
  // Дополнительное логирование для отладки с временным решением через any
  if (isTMA) {
    console.log('✅ Приложение запущено внутри Telegram');
    console.log('👤 Пользователь:', user);
    // Временное решение для дебага с приведением к any
    console.log('🔧 Версия WebApp:', (webApp as any)?.version);
    console.log('📱 Платформа:', (webApp as any)?.platform);
  } else {
    console.log('🌐 Приложение запущено вне Telegram (браузер)');
  }

  return {
    webApp: safeWebApp,
    user,
    isTMA,
    isInTelegram: isTMA,
    // Вспомогательные методы
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};

export default useTelegram;