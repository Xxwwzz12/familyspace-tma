export const isTelegramEnv = () => {
  return !!(
    typeof window !== 'undefined' &&
    window.Telegram &&
    window.Telegram.WebApp
  );
};

export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};