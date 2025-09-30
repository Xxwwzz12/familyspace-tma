// frontend/src/types/telegram-widget.d.ts

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth?: (user: TelegramUser) => void;
    };
    Telegram?: {
      Login?: {
        auth: (
          options: TelegramAuthOptions,
          callback?: (data: TelegramUser | null) => void
        ) => void;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramAuthOptions {
  bot_id: number;
  request_access?: boolean;
  lang?: string;
}

export interface TelegramWidgetOptions {
  authOptions: TelegramAuthOptions;
  container?: string | HTMLElement;
  buttonStyle?: {
    size?: 'large' | 'medium' | 'small';
    radius?: number;
    showAvatar?: boolean;
  };
  onAuth?: (user: TelegramUser) => void;
}

export interface TelegramWidgetInstance {
  update: (options: Partial<TelegramWidgetOptions>) => void;
  destroy: () => void;
}

// Типы для обработки ошибок
export interface TelegramWidgetError {
  error: string;
  error_description?: string;
}

// Тип-гард для проверки объекта TelegramUser
export const isTelegramUser = (data: unknown): data is TelegramUser => {
  const user = data as TelegramUser;
  return (
    typeof user?.id === 'number' &&
    typeof user?.first_name === 'string' &&
    typeof user?.auth_date === 'number' &&
    typeof user?.hash === 'string'
  );
};

// Тип-гард для проверки ошибки
export const isTelegramWidgetError = (data: unknown): data is TelegramWidgetError => {
  const error = data as TelegramWidgetError;
  return typeof error?.error === 'string';
};