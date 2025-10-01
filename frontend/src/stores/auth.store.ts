import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../utils/apiClient';

// Интерфейсы для типизации
interface User {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
}

interface AuthState {
  // Состояния
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  authMethod: 'telegram' | 'widget' | 'none';
  error: string | null;
  
  // Методы аутентификации
  initializeAuth: (initDataRaw: string | null) => Promise<void>;
  loginWithTelegramWidget: (widgetData: any) => Promise<AuthResult>;
  testAuth: () => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  
  // Сеттеры
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      authMethod: 'none',
      error: null,

      /**
       * Инициализация аутентификации
       * @param initDataRaw - данные из Telegram Mini Apps или null для тестовой аутентификации
       */
      initializeAuth: async (initDataRaw: string | null) => {
        console.log('🔄 Инициализация аутентификации с initDataRaw:', initDataRaw);
        set({ isLoading: true, error: null });
        
        try {
          let response;
          
          if (initDataRaw) {
            // Аутентификация через Telegram Mini Apps
            console.log('🔐 Аутентификация через Telegram initData');
            console.log('📤 Отправка initData длиной:', initDataRaw.length);
            
            response = await apiClient.post('/auth/init', { 
              initData: initDataRaw 
            });
          } else {
            // Тестовая аутентификация (fallback)
            console.log('🧪 Использование тестовой аутентификации');
            response = await apiClient.post('/auth/test');
          }
          
          const { user, token } = response.data;
          
          // Сохраняем токен
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }
          
          // Определяем метод аутентификации
          const authMethod = initDataRaw ? 'telegram' : 'widget';
          
          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            isInitialized: true,
            authMethod,
            error: null
          });
          
          console.log('✅ Аутентификация успешна, пользователь:', user);
        } catch (error: any) {
          console.error('❌ Ошибка аутентификации:', error);
          
          // Детальная обработка ошибок
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            
            console.log(`⚙️ Ошибка сервера ${status}:`, message);
            
            if (status === 401) {
              set({ error: 'Ошибка аутентификации: Неверные учетные данные' });
            } else if (status === 500) {
              set({ error: 'Ошибка аутентификации: Ошибка сервера' });
            } else {
              set({ error: `Ошибка аутентификации: ${message}` });
            }
          }
          
          set({ 
            isLoading: false, 
            isInitialized: true,
            isAuthenticated: false 
          });
        }
      },

      /**
       * Аутентификация через Telegram Widget
       * @param widgetData - данные из Telegram Widget
       */
      loginWithTelegramWidget: async (widgetData: any) => {
        console.log('🌐 Запуск аутентификации через Telegram Widget...');
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/auth/widget', widgetData);
          const { user, token } = response.data;
          
          // Сохраняем токен
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            authMethod: 'widget',
            error: null
          });
          
          console.log('✅ Аутентификация через Telegram Widget успешна');
          
          return {
            success: true,
            user,
            token
          };
        } catch (error: any) {
          console.error('❌ Ошибка аутентификации через Widget:', error);
          
          const errorMessage = error.response?.data?.message || 'Ошибка аутентификации через виджет';
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          
          return {
            success: false,
            error: errorMessage
          };
        }
      },

      /**
       * Тестовая аутентификация
       */
      testAuth: async () => {
        console.log('🛜 Вызов тестовой аутентификации');
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/auth/test');
          const { user, token } = response.data;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }
          
          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            authMethod: 'widget',
            error: null
          });
          
          console.log('✅ Тестовая аутентификация успешна:', user);
        } catch (error: any) {
          console.error('❌ Ошибка тестовой аутентификации:', error);
          set({ 
            error: 'Ошибка тестовой аутентификации',
            isLoading: false 
          });
          throw error;
        }
      },

      /**
       * Логин с готовыми данными
       */
      login: (user: User, token: string) => {
        console.log('🔐 Логин с пользователем:', user);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
        
        set({ 
          user, 
          token,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: null
        });
      },

      /**
       * Выход из системы
       */
      logout: () => {
        console.log('🚪 Выход из системы');
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          isLoading: false,
          authMethod: 'none',
          error: null
        });
      },

      // Сеттеры для управления состоянием
      setToken: (token: string | null) => {
        console.log('🔑 Установка токена:', token);
        set({ token });
      },

      setUser: (user: User | null) => {
        console.log('👤 Установка пользователя:', user);
        set({ user });
      },

      setInitialized: (initialized: boolean) => {
        console.log('🏁 Установка isInitialized:', initialized);
        set({ isInitialized: initialized });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💾 Состояние восстановлено', state);
        if (state && typeof state === 'object') {
          return { ...state, isLoading: false };
        }
        return state;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isInitialized: state.isInitialized
      }),
    }
  )
);

// Тип для результата аутентификации
interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}