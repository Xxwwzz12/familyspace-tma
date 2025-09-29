// frontend/src/utils/telegramDebug.ts

interface DiagnosticResult {
  timestamp: string;
  webAppProperties: Record<string, any>;
  initData: string | null;
  initDataParsed: Record<string, any> | null;
  sdkVersion: string | undefined;
  platform: string | undefined;
  issues: string[];
  recommendations: string[];
}

interface InitDataComparison {
  original: Record<string, any> | null;
  modified: Record<string, any> | null;
  differences: string[];
  isSignatureValid: boolean;
}

/**
 * Комплексная диагностика данных Telegram WebApp
 */
export const comprehensiveTelegramDiagnostic = (): DiagnosticResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const timestamp = new Date().toISOString();

  // Получаем WebApp объект
  const webApp = window.Telegram?.WebApp;
  
  if (!webApp) {
    issues.push('Telegram WebApp не обнаружен');
    recommendations.push(
      'Убедитесь, что приложение запущено через Telegram',
      'Проверьте загрузку скрипта Telegram WebApp SDK'
    );
    
    return {
      timestamp,
      webAppProperties: {},
      initData: null,
      initDataParsed: null,
      sdkVersion: undefined,
      platform: undefined,
      issues,
      recommendations
    };
  }

  // Логируем все свойства WebApp
  const webAppProperties = logAllTelegramProperties(webApp);
  
  // Сохраняем initData для анализа
  const initData = webApp.initData || '';
  saveInitDataForAnalysis(initData, timestamp);
  
  // Парсим initData
  const initDataParsed = parseInitData(initData);
  
  // Проверяем параметр signature
  const signatureCheck = checkForSignatureParam(initDataParsed);
  if (!signatureCheck.isValid) {
    issues.push(...signatureCheck.issues);
    recommendations.push(...signatureCheck.recommendations);
  }

  // Проверяем версию SDK
  const versionCheck = checkSDKVersion(webApp.version);
  if (!versionCheck.isValid) {
    issues.push(...versionCheck.issues);
    recommendations.push(...versionCheck.recommendations);
  }

  // Дополнительные проверки
  if (!initData) {
    issues.push('Отсутствуют initData');
    recommendations.push(
      'Проверьте параметры запуска бота',
      'Убедитесь в корректности конфигурации WebApp'
    );
  }

  if (!webApp.platform) {
    issues.push('Не определена платформа');
    recommendations.push('Обновите Telegram до последней версии');
  }

  console.group('🔍 Комплексная диагностика Telegram WebApp');
  console.log('📅 Время проверки:', timestamp);
  console.log('🖥️ Платформа:', webApp.platform);
  console.log('📦 Версия SDK:', webApp.version);
  console.log('📊 InitData длина:', initData.length);
  console.table(webAppProperties);
  
  if (issues.length > 0) {
    console.group('🚨 Проблемы');
    issues.forEach(issue => console.log('•', issue));
    console.groupEnd();
    
    console.group('💡 Рекомендации');
    recommendations.forEach(rec => console.log('•', rec));
    console.groupEnd();
  } else {
    console.log('✅ Все проверки пройдены успешно');
  }
  console.groupEnd();

  return {
    timestamp,
    webAppProperties,
    initData,
    initDataParsed,
    sdkVersion: webApp.version,
    platform: webApp.platform,
    issues,
    recommendations
  };
};

/**
 * Логирует ВСЕ свойства window.Telegram.WebApp
 */
export const logAllTelegramProperties = (webApp: any): Record<string, any> => {
  const properties: Record<string, any> = {};
  
  try {
    // Получаем все свойства объекта, включая унаследованные
    const allProperties = getAllObjectProperties(webApp);
    
    // Фильтруем и логируем безопасные свойства (исключаем функции и большие объекты)
    for (const key of allProperties) {
      try {
        const value = webApp[key];
        
        // Обрабатываем разные типы данных
        if (typeof value === 'function') {
          properties[key] = 'function';
        } else if (value instanceof Date) {
          properties[key] = value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
          // Для объектов логируем только тип и количество ключей
          if (Array.isArray(value)) {
            properties[key] = `array[${value.length}]`;
          } else {
            const keys = Object.keys(value);
            properties[key] = `object{${keys.length} keys}`;
          }
        } else {
          properties[key] = value;
        }
      } catch (error) {
        properties[key] = 'unaccessible';
      }
    }
    
    console.group('📋 Все свойства Telegram WebApp');
    console.table(properties);
    console.groupEnd();
    
  } catch (error) {
    console.error('Ошибка при логировании свойств WebApp:', error);
  }
  
  return properties;
};

/**
 * Сохраняет initData в localStorage для последующего анализа
 */
export const saveInitDataForAnalysis = (initData: string, timestamp: string): void => {
  if (!initData) return;
  
  try {
    const storageKey = 'telegram_initdata_debug';
    const existingData = localStorage.getItem(storageKey);
    const debugEntries = existingData ? JSON.parse(existingData) : [];
    
    // Ограничиваем количество записей (последние 10)
    const newEntry = {
      timestamp,
      initData,
      parsed: parseInitData(initData),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    debugEntries.unshift(newEntry);
    const trimmedEntries = debugEntries.slice(0, 10);
    
    localStorage.setItem(storageKey, JSON.stringify(trimmedEntries));
    console.log('💾 InitData сохранен для анализа:', newEntry);
    
  } catch (error) {
    console.error('Ошибка при сохранении initData:', error);
  }
};

/**
 * Специальная проверка параметра signature
 */
export const checkForSignatureParam = (initDataParsed: Record<string, any> | null) => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;
  
  if (!initDataParsed) {
    issues.push('Нет данных для проверки signature');
    isValid = false;
    return { isValid, issues, recommendations };
  }
  
  const { signature, ...otherParams } = initDataParsed;
  
  if (!signature) {
    issues.push('Отсутствует параметр signature в initData');
    recommendations.push(
      'Проверьте конфигурацию бота',
      'Убедитесь в корректности запуска через Telegram'
    );
    isValid = false;
  } else if (typeof signature !== 'string' || signature.length < 10) {
    issues.push('Некорректная длина signature');
    isValid = false;
  }
  
  // Проверяем наличие других важных параметров
  const requiredParams = ['hash', 'auth_date'];
  for (const param of requiredParams) {
    if (!(param in otherParams)) {
      issues.push(`Отсутствует обязательный параметр: ${param}`);
      isValid = false;
    }
  }
  
  return { isValid, issues, recommendations };
};

/**
 * Сравнивает оригинальные и модифицированные данные
 */
export const compareDataBeforeAfter = (
  originalData: string, 
  modifiedData: string
): InitDataComparison => {
  const differences: string[] = [];
  
  const originalParsed = parseInitData(originalData);
  const modifiedParsed = parseInitData(modifiedData);
  
  // Сравниваем параметры
  if (originalParsed && modifiedParsed) {
    const allKeys = new Set([
      ...Object.keys(originalParsed),
      ...Object.keys(modifiedParsed)
    ]);
    
    for (const key of allKeys) {
      const originalVal = originalParsed[key];
      const modifiedVal = modifiedParsed[key];
      
      if (originalVal !== modifiedVal) {
        if (key === 'signature') {
          differences.push('signature изменен (ожидаемо при модификации данных)');
        } else {
          differences.push(`${key}: "${originalVal}" → "${modifiedVal}"`);
        }
      }
    }
  } else if (!originalParsed && modifiedParsed) {
    differences.push('Оригинальные данные не могут быть распарсены');
  } else if (originalParsed && !modifiedParsed) {
    differences.push('Модифицированные данные не могут быть распарсены');
  } else {
    differences.push('Оба набора данных не могут быть распарсены');
  }
  
  // Проверяем валидность signature (базовая проверка)
  const isSignatureValid = Boolean(
    modifiedParsed?.signature && 
    typeof modifiedParsed.signature === 'string' &&
    modifiedParsed.signature.length > 10
  );
  
  return {
    original: originalParsed,
    modified: modifiedParsed,
    differences,
    isSignatureValid
  };
};

/**
 * Проверяет версию Telegram WebApp SDK
 */
export const checkSDKVersion = (version: string | undefined) => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;
  
  if (!version) {
    issues.push('Не удалось определить версию SDK');
    isValid = false;
    return { isValid, issues, recommendations };
  }
  
  const versionNum = parseFloat(version);
  
  if (isNaN(versionNum)) {
    issues.push(`Некорректная версия SDK: ${version}`);
    isValid = false;
  } else if (versionNum < 6.0) {
    issues.push(`Устаревшая версия SDK: ${version}`);
    recommendations.push('Рекомендуется обновить Telegram до последней версии');
    isValid = false;
  }
  
  return { isValid, issues, recommendations };
};

/**
 * Вспомогательная функция: получает все свойства объекта (включая унаследованные)
 */
const getAllObjectProperties = (obj: any): string[] => {
  const properties = new Set<string>();
  
  let current = obj;
  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current).forEach(prop => {
      properties.add(prop);
    });
    current = Object.getPrototypeOf(current);
  }
  
  return Array.from(properties);
};

/**
 * Вспомогательная функция: парсит initData строку в объект
 */
const parseInitData = (initData: string): Record<string, any> | null => {
  if (!initData) return null;
  
  try {
    const params = new URLSearchParams(initData);
    const result: Record<string, any> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  } catch (error) {
    console.error('Ошибка при парсинге initData:', error);
    return null;
  }
};

/**
 * Получает историю сохраненных initData из localStorage
 */
export const getInitDataHistory = (): any[] => {
  try {
    const storageKey = 'telegram_initdata_debug';
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Ошибка при получении истории initData:', error);
    return [];
  }
};

/**
 * Очищает историю сохраненных initData
 */
export const clearInitDataHistory = (): void => {
  try {
    localStorage.removeItem('telegram_initdata_debug');
    console.log('🗑️ История initData очищена');
  } catch (error) {
    console.error('Ошибка при очистке истории initData:', error);
  }
};

// Экспорт для использования в других модулях
export default {
  comprehensiveTelegramDiagnostic,
  logAllTelegramProperties,
  saveInitDataForAnalysis,
  checkForSignatureParam,
  compareDataBeforeAfter,
  checkSDKVersion,
  getInitDataHistory,
  clearInitDataHistory
};