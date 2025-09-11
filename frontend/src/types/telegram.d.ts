declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            allows_write_to_pm?: boolean;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        // Добавьте другие методы по мере необходимости
      };
    };
  }
}

export {};