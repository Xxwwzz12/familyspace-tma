// frontend/src/utils/environment.ts

/**
 * Утилиты для определения окружения приложения и управления параметрами аутентификации
 * Реализует строгую проверку для надежного различения реального TMA и браузерной среды
 */

export type EnvironmentType = 'telegram' | 'browser' | 'mobile';

// Допустимые платформы для настоящего TMA (исключая браузерную эмуляцию)
const VALID_TELEGRAM_PLATFORMS = ['android', 'ios', 'tdesktop', 'macos', 'windows', 'linux'];

export const Environment = {
  /**
   * Определяет тип окружения приложения с улучшенной эвристикой
   * Возвращает 'telegram' только для настоящего Telegram Mini Apps
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

    // Определение мобильного браузера
    if (this.isMobileDevice()) {
      return 'mobile';
    }

    return 'browser';
  },

  /**
   * Улучшенная проверка на настоящий Telegram Mini App
   * Использует multiple факторы для избежания фальсификации :cite[1]:cite[6]
   */
  isRealTelegramMiniApp(): boolean {
    if (typeof window === 'undefined') return false;

    const telegram = window.Telegram;
    const webApp = telegram?.WebApp;

    // Базовые проверки существования объектов
    if (!telegram || !webApp) {
      return false;
    }

    // Фактор 1: Проверка initData (основной критерий) :cite[1]
    const hasValidInitData = (
      webApp.initData && 
      webApp.initData.length > 0 &&
      this.isValidInitData(webApp.initData)
    );

    // Фактор 2: Строгая проверка платформы :cite[1]
    const hasValidPlatform = (
      webApp.platform && 
      VALID_TELEGRAM_PLATFORMS.includes(webApp.platform)
    );

    // Фактор 3: Проверка пользовательских данных
    const hasUserData = (
      webApp.initDataUnsafe?.user?.id &&
      typeof webApp.initDataUnsafe.user.id === 'number'
    );

    // Фактор 4: Проверка стандартных свойств WebApp API :cite[6]
    const hasWebAppProperties = (
      typeof webApp.isExpanded === 'boolean' &&
      typeof webApp.viewportHeight === 'number' &&
      webApp.viewportHeight > 0
    );

    // Комбинированная проверка: initData + платформа + хотя бы один дополнительный фактор
    const isLikelyRealTelegram = hasValidInitData && hasValidPlatform && (hasUserData || hasWebAppProperties);

    // Детальное логирование для отладки подозрительных случаев
    if (webApp && !isLikelyRealTelegram && process.env.NODE_ENV === 'development') {
      console.warn('Обнаружен подозрительный объект Telegram WebApp:', {
        hasValidInitData,
        hasValidPlatform,
        platform: webApp.platform,
        hasUserData,
        hasWebAppProperties,
        userAgent: navigator.userAgent
      });
    }

    return isLikelyRealTelegram;
  },

  /**
   * Проверяет, запущены ли в Telegram Mini App (алиас для обратной совместимости)
   */
  isTelegram(): boolean {
    return this.isRealTelegramMiniApp();
  },

  /**
   * Проверяет, нужно ли показывать Telegram Login Widget
   * (показываем в браузере и на мобильных, но не в TMA) :cite[1]
   */
  shouldShowTelegramAuth(): boolean {
    return !this.isRealTelegramMiniApp();
  },

  /**
   * Базовая проверка структуры initData :cite[1]
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
      const isValidAuthDate = authDate && !isNaN(parseInt(authdate));
      
      return hasAuthDate && hasHash && isValidAuthDate;
    } catch (error) {
      console.error('Error parsing initData:', error);
      return false;
    }
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
   * Получает информацию о платформе для логирования и аналитики
   */
  getPlatformInfo(): Record<string, any> {
    const env = this.getEnvironment();
    
    if (env === 'telegram' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      const platformValidity = VALID_TELEGRAM_PLATFORMS.includes(webApp.platform || '');
      
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
        initDataValid: this.isValidInitData(webApp.initData || ''),
        userDataPresent: !!webApp.initDataUnsafe?.user
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
  }
};