import { useMemo } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

interface InitDataUnsafe {
  user?: TelegramUser;
  query_id?: string;
  auth_date?: number;
  hash?: string;
}

export const useTelegram = () => {
  const isTelegramEnv = useMemo(() => {
    return typeof window !== 'undefined' && 
           typeof window.Telegram !== 'undefined' && 
           typeof window.Telegram.WebApp !== 'undefined';
  }, []);

  const expandViewport = () => {
    if (isTelegramEnv && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        console.log('✅ Viewport expanded successfully');
      } catch (error) {
        console.error('expandViewport failed:', error);
      }
    }
  };

  // Получаем raw строку initData для аутентификации
  const initDataRaw = isTelegramEnv ? window.Telegram?.WebApp?.initData || '' : '';

  // Получаем разобранный объект для UI
  const initDataUnsafe = isTelegramEnv ? 
    (window.Telegram?.WebApp?.initDataUnsafe as InitDataUnsafe | undefined) : 
    undefined;

  const userData = initDataUnsafe?.user || null;
  const webApp = isTelegramEnv ? window.Telegram?.WebApp || null : null;

  // Логирование для отладки
  console.log('📱 useTelegram hook. isTelegramEnv:', isTelegramEnv);
  console.log('🔐 InitDataRaw (для аутентификации):', initDataRaw ? `present (${initDataRaw.length} chars)` : 'empty');
  console.log('👤 User data:', userData);
  console.log('🌐 WebApp:', webApp);

  return {
    isTelegramEnv,
    expandViewport,
    initDataRaw,    // строка для auth/init на бэкенде
    initDataUnsafe, // объект для компонентов UI
    userData,
    webApp
  };
};

export default useTelegram;