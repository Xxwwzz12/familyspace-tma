// Функция для определения, запущено ли приложение в Telegram
export const isTelegramEnv = (): boolean => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
};

// Дополнительные утилиты для работы с окружением
// Исправлено: теперь это функции, а не значения
export const isDevelopment = (): boolean => import.meta.env.MODE === 'development';
export const isProduction = (): boolean => import.meta.env.MODE === 'production';