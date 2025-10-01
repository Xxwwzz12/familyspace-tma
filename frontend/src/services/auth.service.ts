// frontend/src/services/auth.service.ts

import { Environment } from '../utils/environment';
import { apiClient } from '../utils/apiClient';

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

export class AuthService {
  constructor() {
    this.initializeAuth();
  }

  /**
   * Инициализация аутентификации при загрузке сервиса
   */
  private initializeAuth(): void {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      this.setAuthToken(storedToken);
      console.log('🔑 Restored auth token from storage');
    }
  }

  /**
   * Основной метод аутентификации
   * Автоматически выбирает способ в зависимости от окружения
   */
  async authenticate(): Promise<AuthResult> {
    console.log('🔐 Starting authentication in environment:', Environment.getEnvironment());
    
    if (Environment.isTelegram()) {
      return await this.authenticateTelegram();
    } else {
      // Для браузера возвращаем ожидание виджета
      return {
        success: false,
        error: 'Use Telegram Login Widget for browser authentication'
      };
    }
  }

  /**
   * Аутентификация через Telegram Mini App
   */
  private async authenticateTelegram(): Promise<AuthResult> {
    try {
      const authParams = Environment.getAuthParams();
      
      if (!authParams.initData) {
        return {
          success: false,
          error: 'No initData available in Telegram environment'
        };
      }

      console.log('📱 Authenticating via Telegram Mini App...');
      const response = await apiClient.post('/auth/init', { 
        initData: authParams.initData 
      });
      
      console.log('✅ Telegram Mini App authentication successful');
      
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      return {
        success: true,
        token: response.data.token,
        user: response.data.user
      };
    } catch (error: any) {
      console.error('❌ Telegram Mini App authentication failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 'Telegram authentication failed'
      };
    }
  }

  /**
   * Аутентификация через Telegram Login Widget
   * Вызывается из компонента TelegramAuthWidget после получения данных
   */
  async authenticateTelegramWidget(widgetData: any): Promise<AuthResult> {
    try {
      console.log('🔐 Processing Telegram Widget auth data:', {
        id: widgetData.id,
        first_name: widgetData.first_name,
        username: widgetData.username,
        auth_date: new Date(widgetData.auth_date * 1000).toISOString()
      });

      // ВАЛИДАЦИЯ: Проверяем обязательные поля
      if (!widgetData.id || !widgetData.auth_date || !widgetData.hash) {
        const error = 'Missing required Telegram Widget fields';
        console.error('❌', error, widgetData);
        return { success: false, error };
      }

      // ОТПРАВКА НА БЭКЕНД: Отправляем данные на эндпоинт /auth/telegram-widget
      const response = await apiClient.post('/auth/telegram-widget', {
        authData: widgetData
      });

      console.log('✅ Telegram Widget backend response:', response.data);

      // СОХРАНЕНИЕ ТОКЕНА: Сохраняем JWT токен для будущих запросов
      if (response.data.token) {
        this.setAuthToken(response.data.token);
        console.log('🔑 Auth token saved to storage');
      }

      return {
        success: true,
        token: response.data.token,
        user: response.data.user
      };

    } catch (error: any) {
      console.error('❌ Telegram Widget authentication failed:', error);
      
      // ДЕТАЛЬНАЯ ОБРАБОТКА ОШИБОК: Различаем типы ошибок для лучшего UX
      let errorMessage = 'Telegram Widget authentication failed';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        console.error('📊 Error details:', { status, data });
        
        if (status === 401) {
          errorMessage = data?.error || 'Invalid authentication data';
        } else if (status === 400) {
          errorMessage = data?.error || 'Invalid request data';
        } else if (status >= 500) {
          errorMessage = 'Server error, please try again later';
        }
      } else if (error.request) {
        errorMessage = 'Network error: cannot connect to server';
      }

      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Выход из системы
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    delete apiClient.defaults.headers.common['Authorization'];
    console.log('🚪 User logged out');
    
    if (Environment.isTelegram() && (window as any).Telegram?.WebApp) {
      // (window as any).Telegram.WebApp.close(); // Раскомментировать когда нужно
    }
  }

  /**
   * Проверяет, есть ли сохраненный токен
   */
  hasStoredToken(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Устанавливает токен для будущих запросов
   */
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Получает текущий токен
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Проверяет, аутентифицирован ли пользователь
   */
  isAuthenticated(): boolean {
    return this.hasStoredToken();
  }
}

// Экспортируем singleton экземпляр
export const authService = new AuthService();