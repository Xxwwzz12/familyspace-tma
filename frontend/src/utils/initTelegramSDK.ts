import { logger } from './logger';
import { isTelegramEnv } from './env';

// Заглушка для режима разработки
const createDevWebApp = () => {
  logger.warn('Running in development mode - using WebApp mock');
  
  return {
    ready: () => logger.info('WebApp is ready (development mode)'),
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
    expand: () => logger.info('WebApp expanded'),
    close: () => logger.info('WebApp closed'),
    // Добавляем другие методы по мере необходимости
  };
};

let webApp: any = null;

// Безопасный интерфейс для работы с WebApp
export const safeWebApp = {
  ready: () => webApp?.ready?.(),
  initDataUnsafe: webApp?.initDataUnsafe || {},
  expand: () => webApp?.expand?.(),
  close: () => webApp?.close?.(),
  // Добавьте другие необходимые методы
};

// Асинхронная функция для инициализации
export const initializeWebApp = async () => {
  // Пытаемся использовать глобальный объект Telegram, если доступен
  if (isTelegramEnv()) {
    webApp = window.Telegram?.WebApp;
    logger.info('Telegram WebApp found in global object');
    return;
  }

  try {
    // Пытаемся инициализировать через SDK
    const { init } = await import('@telegram-apps/sdk');
    init();
    // После инициализации получаем webApp из глобального объекта
    webApp = window.Telegram?.WebApp;
    logger.info('Telegram SDK initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Telegram SDK', error);
    // Создаем заглушку для разработки
    webApp = createDevWebApp();
  }
};

export default webApp;