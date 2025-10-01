// frontend/src/services/auth.service.ts

import { Environment } from '../utils/environment';
import { apiClient } from '../utils/apiClient';

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

// Базовый класс для типизированных ошибок (опционально, но рекомендуется)
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      this.setAuthToken(storedToken);
      console.log('🔑 Restored auth token from storage');
    }
  }

  async authenticate(): Promise<AuthResult> {
    console.log('🔐 Starting authentication in environment:', Environment.getEnvironment());
    
    if (Environment.isTelegram()) {
      return await this.authenticateTelegram();
    } else {
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
      
      // 🟢 ОБНОВЛЕННЫЙ ПУТЬ
      const response = await apiClient.post('/api/auth/init', { 
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
      
      // Улучшенная обработка ошибок
      const errorMessage = this.getErrorMessage(error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Аутентификация через Telegram Login Widget
   */
  async authenticateTelegramWidget(widgetData: any): Promise<AuthResult> {
    try {
      console.log('🔐 Processing Telegram Widget auth data:', {
        id: widgetData.id,
        first_name: widgetData.first_name,
        username: widgetData.username,
        auth_date: new Date(widgetData.auth_date * 1000).toISOString()
      });

      // Валидация обязательных полей
      if (!widgetData.id || !widgetData.auth_date || !widgetData.hash) {
        const error = 'Missing required Telegram Widget fields: id, auth_date, hash';
        console.error('❌', error, widgetData);
        return { success: false, error };
      }

      // 🟢 ОСНОВНОЕ ИЗМЕНЕНИЕ: Обновленный путь API
      const response = await apiClient.post('/api/auth/telegram-widget', {
        authData: widgetData
      });

      console.log('✅ Telegram Widget backend response:', response.data);

      // Сохранение токена
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
      
      // Использование улучшенной обработки ошибок
      const errorMessage = this.getErrorMessage(error);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Универсальная обработка ошибок API :cite[3]:cite[10]
   */
  private getErrorMessage(error: any): string {
    // Проверяем, является ли error экземпляром Error :cite[10]
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    
    if (error.response) {
      // Ошибка от сервера с ответом
      const status = error.response.status;
      const data = error.response.data;
      
      console.error('📊 API Error details:', { status, data });
      
      if (status === 401) {
        return data?.error || 'Invalid authentication data';
      } else if (status === 400) {
        return data?.error || 'Invalid request data';
      } else if (status === 404) {
        return 'Authentication service not found';
      } else if (status >= 500) {
        return 'Server error, please try again later';
      }
    } else if (error.request) {
      // Запрос был сделан, но ответ не получен
      return 'Network error: cannot connect to server';
    }
    
    // Неизвестная ошибка
    return error.message || 'Authentication failed';
  }

  /**
   * Выход из системы
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    delete apiClient.defaults.headers.common['Authorization'];
    console.log('🚪 User logged out');
    
    if (Environment.isTelegram() && (window as any).Telegram?.WebApp) {
      // (window as any).Telegram.WebApp.close();
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