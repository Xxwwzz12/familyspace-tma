// Функция для определения, запущено ли приложение в Telegram
export const isTelegramEnv = (): boolean => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
};

// Дополнительные утилиты для работы с окружением
export const isDevelopment = (): boolean => import.meta.env.MODE === 'development';
export const isProduction = (): boolean => import.meta.env.MODE === 'production';

// Функция для получения базового URL API
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};