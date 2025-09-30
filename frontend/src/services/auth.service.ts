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
   * Восстанавливает токен из localStorage если есть
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
      return {
        success: false,
        error: 'Telegram Login Widget not yet implemented'
      };
    }
  }

  /**
   * Аутентификация через Telegram Mini App
   * Использует существующий эндпоинт /auth/init
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
      
      // Сохраняем токен после успешной аутентификации
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
   * Аутентификация через Telegram Login Widget (для браузера)
   * Будет реализована в следующем этапе
   */
  async authenticateTelegramWidget(authData: any): Promise<AuthResult> {
    console.log('🌐 Authenticating via Telegram Widget...', authData);
    
    try {
      // TODO: Реализовать вызов бэкенда для обработки данных виджета
      // Создадим новый эндпоинт /auth/telegram-widget
      const response = await apiClient.post('/auth/telegram-widget', authData);
      
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      return {
        success: true,
        token: response.data.token,
        user: response.data.user
      };
    } catch (error: any) {
      console.error('❌ Telegram Widget authentication failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 'Telegram Widget authentication failed'
      };
    }
  }

  /**
   * Выход из системы
   */
  logout(): void {
    // Удаляем токен из localStorage
    localStorage.removeItem('auth_token');
    
    // Удаляем заголовок Authorization из apiClient
    delete apiClient.defaults.headers.common['Authorization'];
    
    console.log('🚪 User logged out');
    
    // Если в Telegram, можно закрыть WebApp
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