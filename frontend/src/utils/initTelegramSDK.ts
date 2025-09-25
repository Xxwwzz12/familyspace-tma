// frontend/src/utils/initTelegramSDK.ts
import { logger } from './logger';

console.log('🔄 Инициализация Telegram SDK...');

// Заглушка для режима разработки
const createDevWebApp = () => {
  logger.warn('Running in development mode - using WebApp mock');
  
  return {
    ready: () => {
      console.log('✅ WebApp is ready (development mode)');
      logger.info('WebApp is ready (development mode)');
    },
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
        is_premium: true
      }
    },
    expand: () => {
      console.log('🔄 WebApp expanded');
      logger.info('WebApp expanded');
    },
    close: () => {
      console.log('🔄 WebApp closed');
      logger.info('WebApp closed');
    },
    // Добавляем только существующие методы
  };
};

// Получаем webApp из глобального объекта или создаем заглушку
const webApp = typeof window !== 'undefined' && window.Telegram?.WebApp 
  ? window.Telegram.WebApp 
  : createDevWebApp();

// Функция инициализации Telegram SDK
export const initTelegramSDK = (): boolean => {
  if (typeof window === 'undefined' || typeof window.Telegram === 'undefined') {
    console.warn('⚠️ Telegram SDK not available');
    logger.warn('Telegram SDK not available');
    return false;
  }

  try {
    window.Telegram.WebApp?.ready();
    console.log('✅ Telegram SDK initialized successfully');
    logger.info('Telegram SDK initialized successfully');
    
    window.Telegram.WebApp?.expand();
    console.log('✅ Viewport expanded');
    logger.info('Viewport expanded');
    
    return true;
  } catch (error) {
    console.error('❌ Telegram SDK initialization failed:', error);
    logger.error('Telegram SDK initialization failed:', error);
    return false;
  }
};

// Безопасный интерфейс для работы с WebApp (только существующие методы)
export const safeWebApp = {
  ready: () => {
    console.log('🔄 Вызов webApp.ready()');
    logger.info('Calling webApp.ready()');
    return webApp?.ready?.();
  },
  initDataUnsafe: webApp?.initDataUnsafe || {},
  expand: () => {
    console.log('🔄 Вызов webApp.expand()');
    logger.info('Calling webApp.expand()');
    return webApp?.expand?.();
  },
  close: () => {
    console.log('🔄 Вызов webApp.close()');
    logger.info('Calling webApp.close()');
    return webApp?.close?.();
  },
  // Удалены несуществующие методы: showPopup, showAlert, showConfirm
};

// Инициализируем SDK при импорте модуля (только в браузере)
if (typeof window !== 'undefined') {
  initTelegramSDK();
}

export default webApp;