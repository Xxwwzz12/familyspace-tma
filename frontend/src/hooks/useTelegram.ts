import { useEffect, useState, useMemo, useCallback } from 'react';

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

interface DebugTelegramData {
  initData: string;
  initDataUnsafe: any;
  version: string;
  platform: string;
  rawParams: Record<string, string>;
  timestamp: string;
  userAgent: string;
}

// 🔧 Вспомогательная функция для парсинга initData
function parseInitData(initData: string): Record<string, string> {
  if (!initData) return {};
  
  const params = new URLSearchParams(initData);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}

// Функция для сохранения диагностических данных
const saveTelegramDiagnostics = (webApp: any) => {
  if (!webApp) return;

  const initData = webApp.initData || '';
  const initDataUnsafe = webApp.initDataUnsafe || {};
  const version = webApp.version || 'unknown';
  const platform = webApp.platform || 'unknown';
  
  const debugData: DebugTelegramData = {
    initData,
    initDataUnsafe,
    version,
    platform,
    rawParams: parseInitData(initData),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  // 💾 Сохраняем в глобальный объект для отображения на странице
  (window as any).debugTelegram = debugData;

  // 💾 Резервное сохранение в localStorage
  try {
    localStorage.setItem('debug_telegram_data', JSON.stringify(debugData, null, 2));
    localStorage.setItem('debug_telegram_initData', initData);
    localStorage.setItem('debug_telegram_version', version);
    localStorage.setItem('debug_telegram_platform', platform);
    localStorage.setItem('debug_telegram_timestamp', debugData.timestamp);
  } catch (e) {
    console.warn('Не удалось сохранить в localStorage:', e);
  }

  console.log('💾 Данные Telegram сохранены для диагностики:', debugData);
};

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

  // 🔍 ДИАГНОСТИКА: Сохраняем данные Telegram для анализа
  useEffect(() => {
    if (isTelegramEnv && window.Telegram?.WebApp) {
      saveTelegramDiagnostics(window.Telegram.WebApp);
    }
  }, [isTelegramEnv]);

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

  // Функция для получения initData для аутентификации с логированием
  const getInitDataForAuth = useCallback(() => {
    if (!isTelegramEnv) {
      console.log('🔍 Not in Telegram environment, returning empty initData');
      return '';
    }

    const rawInitData = window.Telegram?.WebApp?.initData || '';
    
    // Детальное логирование передаваемых данных
    console.log('🔍 Raw initData for auth:', rawInitData);
    console.log('📏 InitData length:', rawInitData.length);
    console.log('🔢 InitData character count:', rawInitData.split('').length);
    console.log('📋 InitData segments:', rawInitData.split('&').length);
    
    // Проверяем, что данные не модифицированы
    if (rawInitData) {
      const hashIndex = rawInitData.indexOf('hash=');
      if (hashIndex !== -1) {
        console.log('✅ Hash found in initData at position:', hashIndex);
      } else {
        console.warn('⚠️ Hash not found in initData');
      }
    }
    
    return rawInitData;
  }, [isTelegramEnv]);

  // Функция для получения диагностических данных
  const getDiagnostics = useCallback((): DebugTelegramData | null => {
    if (typeof window === 'undefined') return null;
    
    return (window as any).debugTelegram || null;
  }, []);

  // Логирование для отладки
  console.log('📱 useTelegram hook:', {
    isLoading,
    isSDKReady,
    isTelegramEnv,
    initDataLength: initData?.length || 0,
    hasUserData: !!userData,
    diagnostics: getDiagnostics() ? 'available' : 'unavailable'
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
    webApp,
    
    // Функция для получения initData с логированием
    getInitDataForAuth,
    
    // 🔍 Диагностические функции
    getDiagnostics,
    hasDiagnostics: !!getDiagnostics()
  };
};

export default useTelegram;