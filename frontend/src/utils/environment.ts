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
  MainButton?: any;
  BackButton?: any;
}

interface Telegram {
  WebApp?: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: Telegram;
  }
}

// Список допустимых платформ для настоящего TMA
const VALID_TELEGRAM_PLATFORMS = [
  'android', 'ios', 'tdesktop', 'macos', 'windows', 'linux', 'unknown'
];

export const Environment = {
  /**
   * Определяет тип окружения приложения с улучшенной проверкой подлинности TMA
   */
  getEnvironment(): EnvironmentType {
    // SSR безопасность
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'browser';
    }

    // Расширенная проверка на настоящий TMA
    if (this.isRealTelegramMiniApp()) {
      return 'telegram';
    }

    // Улучшенное определение мобильных устройств
    const isMobile = this.isMobileDevice();
    return isMobile ? 'mobile' : 'browser';
  },

  /**
   * Улучшенная проверка на настоящий Telegram Mini App
   * Использует multiple факторы для избежания фальсификации
   */
  isRealTelegramMiniApp(): boolean {
    if (typeof window === 'undefined') return false;

    const telegram = window.Telegram;
    const webApp = telegram?.WebApp;

    // Базовые проверки существования объектов
    if (!telegram || !webApp) {
      return false;
    }

    // Фактор 1: Проверка initData (основной критерий)
    const hasValidInitData = (
      webApp.initData && 
      webApp.initData.length > 0 &&
      this.isValidInitData(webApp.initData)
    );

    // Фактор 2: Строгая проверка платформы
    const hasValidPlatform = (
      webApp.platform && 
      VALID_TELEGRAM_PLATFORMS.includes(webApp.platform) &&
      // Критически важно: исключаем платформу 'web' - это браузерная эмуляция
      webApp.platform !== 'web'
    );

    // Фактор 3: Проверка версии (дополнительный критерий)
    const hasValidVersion = (
      webApp.version && 
      typeof webApp.version === 'string' &&
      webApp.version.length >= 5 // Минимум "6.0.0"
    );

    // Фактор 4: Проверка специфичных свойств WebApp
    const hasWebAppProperties = (
      typeof webApp.isExpanded === 'boolean' &&
      typeof webApp.viewportHeight === 'number' &&
      webApp.viewportHeight > 0
    );

    // Комбинированная проверка: initData ОБЯЗАТЕЛЕН + валидная платформа + хотя бы один дополнительный фактор
    const isLikelyRealTelegram = hasValidInitData && hasValidPlatform && (
      hasValidVersion || 
      hasWebAppProperties
    );

    // Детальное логирование для отладки
    if (webApp && !isLikelyRealTelegram) {
      console.warn('Обнаружен подозрительный объект Telegram WebApp:', {
        hasValidInitData,
        hasValidPlatform,
        platform: webApp.platform,
        hasValidVersion,
        hasWebAppProperties,
        userAgent: navigator.userAgent,
        referrer: document.referrer
      });
    }

    return isLikelyRealTelegram;
  },

  /**
   * Базовая проверка структуры initData
   */
  isValidInitData(initData: string): boolean {
    if (!initData || typeof initData !== 'string') {
      return false;
    }

    try {
      // Проверяем базовую структуру initData (query string формата)
      const params = new URLSearchParams(initData);
      
      // Минимальные проверки на наличие ожидаемых параметров
      const hasAuthDate = params.has('auth_date');
      const hasHash = params.has('hash');
      
      // Дополнительные проверки для большей надежности
      const authDate = params.get('auth_date');
      const isValidAuthDate = authDate && !isNaN(parseInt(authDate));
      
      return hasAuthDate && hasHash && isValidAuthDate;
    } catch (error) {
      console.error('Error parsing initData:', error);
      return false;
    }
  },

  /**
   * Проверяет, запущены ли в Telegram Mini App (алиас для обратной совместимости)
   */
  isTelegram(): boolean {
    return this.isRealTelegramMiniApp();
  },

  /**
   * Проверяет, нужно ли показывать Telegram Login Widget
   * (показываем в браузере и на мобильных, но не в TMA)
   */
  shouldShowTelegramAuth(): boolean {
    return !this.isRealTelegramMiniApp();
  },

  /**
   * Получает параметры аутентизации в зависимости от окружения
   */
  getAuthParams(): { 
    initData?: string; 
    initDataRaw?: string;
    initDataUnsafe?: any;
    isValid?: boolean;
    platform?: string;
  } {
    if (this.isRealTelegramMiniApp() && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      const isValid = this.isValidInitData(webApp.initData || '');
      
      return {
        initData: webApp.initData,
        initDataRaw: webApp.initData,
        initDataUnsafe: webApp.initDataUnsafe,
        isValid,
        platform: webApp.platform
      };
    }

    return { isValid: false };
  },

  /**
   * Получает информацию о платформе для логирования и аналитики
   */
  getPlatformInfo(): Record<string, any> {
    const env = this.getEnvironment();
    
    if (env === 'telegram' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      const platformValidity = VALID_TELEGRAM_PLATFORMS.includes(webApp.platform || '') && 
                              webApp.platform !== 'web';
      
      return {
        environment: 'telegram',
        platform: webApp.platform,
        platformValid: platformValidity,
        version: webApp.version,
        colorScheme: webApp.colorScheme,
        isExpanded: webApp.isExpanded,
        viewportHeight: webApp.viewportHeight,
        viewportStableHeight: webApp.viewportStableHeight,
        initDataLength: webApp.initData?.length || 0,
        initDataValid: this.isValidInitData(webApp.initData || '')
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
   * Получает список допустимых платформ для TMA (для тестирования)
   */
  getValidTelegramPlatforms(): string[] {
    return [...VALID_TELEGRAM_PLATFORMS];
  },

  /**
   * Инициализация Telegram WebApp (только для настоящего TMA)
   */
  initializeTelegramWebApp(): void {
    if (this.isRealTelegramMiniApp() && window.Telegram?.WebApp) {
      try {
        const webApp = window.Telegram.WebApp;
        
        // Разворачиваем на весь экран
        webApp.expand();
        
        // Включаем кнопку "Назад" если нужно
        webApp.BackButton.isVisible = false;
        
        // Настраиваем цветовую схему
        webApp.setHeaderColor('#000000');
        webApp.setBackgroundColor('#ffffff');
        
        console.log('Telegram WebApp initialized:', {
          platform: webApp.platform,
          version: webApp.version,
          platformValid: VALID_TELEGRAM_PLATFORMS.includes(webApp.platform || '') && webApp.platform !== 'web',
          initDataValid: this.isValidInitData(webApp.initData || '')
        });
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