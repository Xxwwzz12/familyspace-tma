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
    // Добавляем другие методы по мере необходимости
  };
};

let webApp: any = null;

// Функция инициализации Telegram SDK
export const initTelegramSDK = (): boolean => {
  if (typeof window.Telegram === 'undefined') {
    console.warn('⚠️ Telegram SDK not available');
    logger.warn('Telegram SDK not available');
    webApp = createDevWebApp();
    return false;
  }

  try {
    // Инициализируем SDK
    window.Telegram.WebApp.ready();
    console.log('✅ Telegram SDK initialized successfully');
    logger.info('Telegram SDK initialized successfully');
    
    // Расширяем viewport после инициализации
    window.Telegram.WebApp.expand();
    console.log('✅ Viewport expanded');
    logger.info('Viewport expanded');
    
    webApp = window.Telegram.WebApp;
    return true;
  } catch (error) {
    console.error('❌ Telegram SDK initialization failed:', error);
    logger.error('Telegram SDK initialization failed:', error);
    webApp = createDevWebApp();
    return false;
  }
};

// Безопасный интерфейс для работы с WebApp
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
  showPopup: (params: any) => {
    console.log('🔄 Вызов webApp.showPopup()', params);
    logger.info('Calling webApp.showPopup()', params);
    return webApp?.showPopup?.(params);
  },
  showAlert: (message: string) => {
    console.log('🔄 Вызов webApp.showAlert()', message);
    logger.info('Calling webApp.showAlert()', message);
    return webApp?.showAlert?.(message);
  },
  showConfirm: (message: string) => {
    console.log('🔄 Вызов webApp.showConfirm()', message);
    logger.info('Calling webApp.showConfirm()', message);
    return webApp?.showConfirm?.(message);
  },
  // Добавьте другие необходимые методы
};

// Инициализируем SDK при импорте модуля
initTelegramSDK();

export default webApp;