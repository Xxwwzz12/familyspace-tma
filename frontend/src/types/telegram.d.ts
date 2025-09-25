// src/types/telegram.d.ts
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        // Основные свойства аутентификации
        initData: string;
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

        // Параметры темы и внешнего вида
        themeParams: {
          bg_color: string;
          text_color: string;
          hint_color: string;
          link_color: string;
          button_color: string;
          button_text_color: string;
          secondary_bg_color: string;
        };
        colorScheme: 'light' | 'dark';
        
        // Состояние и размеры WebApp
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        isVersionAtLeast: (version: string) => boolean;
        
        // Основные методы
        ready: () => void;
        expand: () => void;
        close: () => void;
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text: string;
          }>;
        }) => void;
        showAlert: (message: string) => void;
        showConfirm: (message: string) => void;
        
        // Методы внешнего вида
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        
        // Информация о платформе
        version: string;
        platform: string;
        headerColor: string;
        backgroundColor: string;
        
        // Дополнительные свойства
        BotApp?: any;
        MainButton: any;
        BackButton: any;
        HapticFeedback: any;
        
        // Добавьте другие свойства по необходимости
      };
    };
  }
}

export {};