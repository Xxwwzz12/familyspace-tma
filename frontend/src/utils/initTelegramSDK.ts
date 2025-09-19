import { logger } from './logger';
import { isTelegramEnv } from './env';

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

// Асинхронная функция для инициализации
export const initializeWebApp = async () => {
  // Пытаемся использовать глобальный объект Telegram, если доступен
  if (isTelegramEnv()) {
    webApp = window.Telegram?.WebApp;
    console.log('✅ Telegram WebApp found in global object');
    logger.info('Telegram WebApp found in global object');
    return;
  }

  try {
    // Пытаемся инициализировать через SDK
    const { init, viewport } = await import('@telegram-apps/sdk');
    init();
    // После инициализации получаем webApp из глобального объекта
    webApp = window.Telegram?.WebApp;
    console.log('✅ Telegram SDK initialized successfully');
    logger.info('Telegram SDK initialized successfully');
    
    // Монтируем viewport и обновляем layout
    console.log('🔄 Монтирование viewport...');
    logger.info('Mounting viewport...');
    
    viewport.mount({ timeout: 5000 })
      .then(() => {
        console.log('✅ Viewport mounted successfully');
        logger.info('Viewport mounted successfully');
        updateLayoutForViewport({
          width: window.innerWidth,
          height: window.innerHeight,
          isExpanded: true,
        });
      })
      .catch((error) => {
        console.warn('⚠️ Viewport mounting timeout or error:', error);
        logger.warn('Viewport mounting timeout or error:', error);
      });
  } catch (error) {
    console.error('❌ Failed to initialize Telegram SDK', error);
    logger.error('Failed to initialize Telegram SDK', error);
    // Создаем заглушку для разработки
    webApp = createDevWebApp();
  }
};

// Функция для обновления layout
function updateLayoutForViewport(viewportInfo: { width: number; height: number; isExpanded: boolean }): void {
  const { width, height, isExpanded } = viewportInfo;

  document.documentElement.style.setProperty('--viewport-width', `${width}px`);
  document.documentElement.style.setProperty('--viewport-height', `${height}px`);

  if (isExpanded) {
    document.body.classList.add('viewport-expanded');
    console.log('✅ Viewport expanded');
    logger.info('Viewport expanded');
  } else {
    document.body.classList.remove('viewport-expanded');
    console.log('✅ Viewport collapsed');
    logger.info('Viewport collapsed');
  }
}

export default webApp;