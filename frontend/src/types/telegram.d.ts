declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        // Raw строка для серверной аутентификации
        initData: string;
        
        // Разобранный объект для клиентского использования
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            allows_write_to_pm?: boolean;
          };
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        
        // Методы WebApp
        ready: () => void;
        expand: () => void;
        close: () => void;
        showPopup: (params: any) => void;
        showAlert: (message: string) => void;
        showConfirm: (message: string) => void;
        
        // Свойства WebApp
        version: string;
        platform: string;
        // Добавьте другие свойства по мере необходимости
      };
    };
  }
}

export {};