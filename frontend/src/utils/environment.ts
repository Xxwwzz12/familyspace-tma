// frontend/src/utils/environment.ts

/**
 * Утилиты для определения окружения приложения и управления параметрами аутентификации
 */

export type EnvironmentType = 'telegram' | 'browser' | 'mobile';

// Типы для Telegram WebApp для улучшения TypeScript поддержки
interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: any;
  platform?: string;
  version?: string;
  colorScheme?: string;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
}

interface Telegram {
  WebApp?: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: Telegram;
  }
}

export const Environment = {
  /**
   * Определяет тип окружения приложения
   */
  getEnvironment(): EnvironmentType {
    // SSR безопасность
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'browser';
    }

    // Проверяем наличие Telegram WebApp
    if (this.isTelegram()) {
      return 'telegram';
    }

    // Улучшенное определение мобильных устройств
    const isMobile = this.isMobileDevice();
    return isMobile ? 'mobile' : 'browser';
  },

  /**
   * Проверяет, запущены ли в Telegram Mini App
   */
  isTelegram(): boolean {
    return !!(typeof window !== 'undefined' && window.Telegram?.WebApp);
  },

  /**
   * Проверяет, нужно ли показывать Telegram Login Widget
   * (показываем в браузере и на мобильных, но не в TMA)
   */
  shouldShowTelegramAuth(): boolean {
    return !this.isTelegram();
  },

  /**
   * Получает параметры аутентизации в зависимости от окружения
   */
  getAuthParams(): { 
    initData?: string; 
    initDataRaw?: string;
    initDataUnsafe?: any;
  } {
    if (this.isTelegram() && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      return {
        initData: webApp.initData,
        initDataRaw: webApp.initData,
        initDataUnsafe: webApp.initDataUnsafe
      };
    }

    return {};
  },

  /**
   * Получает информацию о платформе для логирования и аналитики
   */
  getPlatformInfo(): Record<string, any> {
    const env = this.getEnvironment();
    
    if (env === 'telegram' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      return {
        environment: 'telegram',
        platform: webApp.platform,
        version: webApp.version,
        colorScheme: webApp.colorScheme,
        isExpanded: webApp.isExpanded,
        viewportHeight: webApp.viewportHeight,
        viewportStableHeight: webApp.viewportStableHeight
      };
    }

    // Для браузера и мобильных
    const isMobile = this.isMobileDevice();
    return {
      environment: env,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      isMobile,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  },

  /**
   * Улучшенная проверка мобильного устройства
   */
  isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Tablet|Touchpad|Kindle/i.test(userAgent);
    
    return isMobile || isTablet || window.innerWidth <= 768;
  },

  /**
   * Инициализация Telegram WebApp (если применимо)
   */
  initializeTelegramWebApp(): void {
    if (this.isTelegram() && window.Telegram?.WebApp) {
      try {
        const webApp = window.Telegram.WebApp;
        
        // Разворачиваем на весь экран
        webApp.expand();
        
        // Включаем кнопку "Назад" если нужно
        webApp.BackButton.isVisible = false;
        
        // Настраиваем цветовую схему
        webApp.setHeaderColor('#000000');
        webApp.setBackgroundColor('#ffffff');
        
        console.log('Telegram WebApp initialized:', this.getPlatformInfo());
      } catch (error) {
        console.error('Error initializing Telegram WebApp:', error);
      }
    }
  },

  /**
   * Получает базовый URL для API запросов
   */
  getApiBaseUrl(): string {
    const baseUrl = process.env.REACT_APP_API_URL || 'https://api.yourdomain.com';
    
    // В development всегда используем localhost
    if (process.env.NODE_ENV === 'development') {
      return process.env.REACT_APP_DEV_API_URL || 'http://localhost:3001/api';
    }
    
    return baseUrl;
  },

  /**
   * Проверяет development режим
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  /**
   * Получает версию приложения
   */
  getAppVersion(): string {
    return process.env.REACT_APP_VERSION || '1.0.0';
  }
};

// Автоматическая инициализация при импорте
if (typeof window !== 'undefined') {
  Environment.initializeTelegramWebApp();
}

export default Environment;