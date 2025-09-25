// frontend/src/utils/telegramDebug.ts

interface TelegramDiagnostics {
  // Основные флаги
  isInTelegram: boolean;
  hasWebApp: boolean;
  hasInitData: boolean;
  isExpanded: boolean;
  isIframe: boolean;
  
  // Детальная информация
  platform: string | undefined;
  version: string | undefined;
  initDataLength: number;
  viewportHeight: number;
  urlParams: string;
  
  // Проблемы и рекомендации
  issues: string[];
  suggestions: string[];
}

export const diagnoseTelegramEnv = (): TelegramDiagnostics => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Используем глобальный window.Telegram без дополнительных объявлений
  const telegram = window.Telegram;
  const webApp = telegram?.WebApp;
  
  // Базовые проверки
  const isInTelegram = typeof telegram !== 'undefined';
  const hasWebApp = typeof webApp !== 'undefined';
  const hasInitData = Boolean(webApp?.initData);
  const initData = webApp?.initData || '';
  const isExpanded = Boolean(webApp?.isExpanded);

  // Дополнительные проверки
  const isIframe = window.self !== window.top;
  const urlParams = new URLSearchParams(window.location.search).toString();
  const viewportHeight = window.innerHeight;

  // Анализ проблем
  if (!isInTelegram) {
    issues.push('Объект Telegram не обнаружен в window');
    suggestions.push(
      'Запустите приложение через Telegram-клиент', 
      'Проверьте блокировку скриптов браузера',
      'Убедитесь, что скрипт telegram-web-app.js загружен'
    );
  }

  if (isInTelegram && !hasWebApp) {
    issues.push('Отсутствует объект WebApp');
    suggestions.push(
      'Обновите Telegram до актуальной версии',
      'Используйте официальный клиент Telegram',
      'Проверьте версию Telegram WebApp API'
    );
  }

  if (hasWebApp && !hasInitData) {
    issues.push('Отсутствуют initData');
    suggestions.push(
      'Проверьте корректность передачи startParam',
      'Убедитесь в правильности конфигурации бота',
      'Проверьте параметры запуска WebApp'
    );
  }

  if (hasInitData && initData.length < 20) {
    issues.push('Слишком короткие initData');
    suggestions.push('Проверьте параметры запуска бота');
  }

  if (isIframe) {
    issues.push('Приложение загружено в iframe');
    suggestions.push(
      'Проверьте настройки безопасности браузера',
      'Убедитесь в корректности домена приложения'
    );
  }

  if (viewportHeight < 100) {
    issues.push('Аномальная высота viewport');
    suggestions.push(
      'Возможно приложение не развернуто на весь экран',
      'Вызовите метод Telegram.WebApp.expand()'
    );
  }

  // Формирование результата
  const diagnostics: TelegramDiagnostics = {
    isInTelegram,
    hasWebApp,
    hasInitData,
    isExpanded,
    isIframe,
    platform: webApp?.platform,
    version: webApp?.version,
    initDataLength: initData.length,
    viewportHeight,
    urlParams,
    issues,
    suggestions
  };

  // Логирование в консоль с форматированием
  console.group('🔍 Telegram WebApp Diagnostics');
  console.table({
    'In Telegram': isInTelegram ? '✅' : '❌',
    'WebApp Available': hasWebApp ? '✅' : '❌',
    'Has Init Data': hasInitData ? '✅' : '❌',
    'Is Expanded': isExpanded ? '✅' : '❌',
    'Viewport Height': `${viewportHeight}px`,
    'Platform': diagnostics.platform || 'N/A',
    'Version': diagnostics.version || 'N/A'
  });
  
  if (issues.length > 0) {
    console.group('🚨 Issues');
    issues.forEach(issue => console.log(`• ${issue}`));
    console.groupEnd();
    
    console.group('💡 Suggestions');
    suggestions.forEach(suggestion => console.log(`• ${suggestion}`));
    console.groupEnd();
  } else {
    console.log('✅ Все проверки пройдены успешно');
  }
  console.groupEnd();

  return diagnostics;
};

// Безопасная проверка методов WebApp
export const checkTelegramMethod = (methodName: string): boolean => {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;
  
  // Используем правильный индексный доступ через ключи WebApp
  const method = webApp[methodName as keyof typeof webApp];
  return typeof method === 'function';
};

// Проверка конкретных свойств WebApp
export const checkTelegramProperty = (propertyName: string): boolean => {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;
  
  return propertyName in webApp;
};

// Получение значения свойства WebApp
export const getTelegramProperty = <T>(propertyName: string): T | undefined => {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return undefined;
  
  return webApp[propertyName as keyof typeof webApp] as T;
};

// Экспорт готового отчета для показа в UI
export const generateDiagnosticReport = (): string => {
  const diagnostics = diagnoseTelegramEnv();
  
  const report = `
Telegram Environment Report:
============================
• Telegram API: ${diagnostics.isInTelegram ? '✅ Available' : '❌ Missing'}
• WebApp Object: ${diagnostics.hasWebApp ? '✅ Available' : '❌ Missing'}
• Init Data: ${diagnostics.hasInitData ? `✅ Present (${diagnostics.initDataLength} chars)` : '❌ Missing'}
• Platform: ${diagnostics.platform || 'Unknown'}
• Version: ${diagnostics.version || 'Unknown'}
• Viewport: ${diagnostics.viewportHeight}px
• Is Expanded: ${diagnostics.isExpanded ? 'Yes' : 'No'}
• Issues detected: ${diagnostics.issues.length}

${diagnostics.issues.length > 0 ? `
Recommendations:
${diagnostics.suggestions.map(s => `• ${s}`).join('\n')}
` : '✅ Environment looks normal'}
  `.trim();

  return report;
};

// Утилита для безопасного вызова методов WebApp
export const callTelegramMethod = <T>(
  methodName: string, 
  ...args: any[]
): T | undefined => {
  if (!checkTelegramMethod(methodName)) {
    console.warn(`Метод Telegram.WebApp.${methodName} не доступен`);
    return undefined;
  }
  
  try {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return undefined;
    
    const method = webApp[methodName as keyof typeof webApp] as Function;
    return method.apply(webApp, args);
  } catch (error) {
    console.error(`Ошибка при вызове Telegram.WebApp.${methodName}:`, error);
    return undefined;
  }
};

// Экспорт текущего состояния WebApp для отладки
export const getWebAppState = () => {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return null;
  
  return {
    initData: webApp.initData,
    platform: webApp.platform,
    version: webApp.version,
    isExpanded: webApp.isExpanded,
    // Добавляем другие важные свойства по мере необходимости
  };
};