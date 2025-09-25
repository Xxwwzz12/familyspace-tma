import { useEffect, useState, useMemo } from 'react';

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

// Функция для ожидания загрузки Telegram SDK
const waitForTelegramSDK = (timeout = 3000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      console.log('✅ Telegram SDK already loaded');
      return resolve(true);
    }

    console.log('⏳ Waiting for Telegram SDK to load...');

    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        clearInterval(checkInterval);
        console.log('✅ Telegram SDK loaded successfully');
        resolve(true);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn('⚠️ Telegram SDK loading timeout');
      resolve(false);
    }, timeout);
  });
};

export const useTelegram = () => {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initSDK = async () => {
      setIsLoading(true);
      try {
        const ready = await waitForTelegramSDK();
        if (mounted) {
          setIsSDKReady(ready);
        }
      } catch (error) {
        console.error('Error loading Telegram SDK:', error);
        if (mounted) {
          setIsSDKReady(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSDK();

    return () => {
      mounted = false;
    };
  }, []);

  const isTelegramEnv = useMemo(() => {
    return isSDKReady && 
           typeof window.Telegram !== 'undefined' && 
           typeof window.Telegram.WebApp !== 'undefined';
  }, [isSDKReady]);

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
  const initData = isTelegramEnv ? window.Telegram?.WebApp?.initData || '' : '';

  // Получаем разобранный объект для UI
  const initDataUnsafe = isTelegramEnv ? 
    (window.Telegram?.WebApp?.initDataUnsafe as InitDataUnsafe | undefined) : 
    undefined;

  const userData = initDataUnsafe?.user || null;
  const webApp = isTelegramEnv ? window.Telegram?.WebApp || null : null;

  // Логирование для отладки
  console.log('📱 useTelegram hook:', {
    isLoading,
    isSDKReady,
    isTelegramEnv,
    initDataLength: initData?.length || 0,
    hasUserData: !!userData
  });

  return {
    // Состояние загрузки
    isLoading,
    isSDKReady,
    
    // Основные свойства
    isTelegramEnv,
    expandViewport,
    
    // Данные инициализации
    initData,        // строка для auth/init на бэкенде
    initDataUnsafe,  // объект для компонентов UI
    userData,
    
    // WebApp экземпляр
    webApp
  };
};

export default useTelegram;