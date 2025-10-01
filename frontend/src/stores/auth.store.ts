import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../utils/apiClient';

interface User {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  authMethod: 'telegram' | 'widget' | 'none';
  error: string | null;
  
  initializeAuth: (initDataRaw: string | null) => Promise<void>;
  loginWithTelegramWidget: (widgetData: any) => Promise<AuthResult>;
  testAuth: () => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      authMethod: 'none',
      error: null,

      /**
       * Инициализирует аутентификацию пользователя
       * @param initDataRaw - Сырые данные инициализации Telegram Web App или null для тестовой аутентификации
       */
      initializeAuth: async (initDataRaw: string | null) => {
        console.log('🔄 initializeAuth called with initDataRaw:', initDataRaw);
        set({ isLoading: true, error: null });
        
        try {
          let response;
          
          if (initDataRaw) {
            // 🟢 ОБНОВЛЕННЫЙ ПУТЬ: Добавлен префикс /api/
            console.log('🔐 Authenticating with Telegram initData');
            console.log('📤 Sending initData length:', initDataRaw.length);
            
            response = await apiClient.post('/api/auth/init', { 
              initData: initDataRaw 
            });
          } else {
            // 🟢 ОБНОВЛЕННЫЙ ПУТЬ: Добавлен префикс /api/
            console.log('🧪 Using test authentication (initDataRaw is null)');
            response = await apiClient.post('/api/auth/test');
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
          
          console.log('✅ Authentication successful:', user);
        } catch (error: any) {
          console.error('❌ Authentication failed:', error);
          
          // Детальная обработка ошибок
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            
            console.log(`⚙️ Server error ${status}:`, message);
            
            if (status === 401) {
              console.log('🔐 InitData validation failed on server');
              set({ error: 'Authentication failed: Invalid credentials' });
            } else if (status === 400) {
              console.log('📝 Bad request: Invalid initData format');
              set({ error: 'Authentication failed: Invalid request format' });
            } else if (status === 500) {
              console.log('⚙️ Server error during authentication');
              set({ error: 'Authentication failed: Server error' });
            } else {
              set({ error: `Authentication failed: ${message}` });
            }
          } else if (error.request) {
            // Ошибка сети (нет ответа от сервера)
            console.log('🌐 Network error: No response from server');
            set({ error: 'Authentication failed: Network error - please check your connection' });
          } else {
            // Другие ошибки
            console.log('❓ Other error:', error.message);
            set({ error: `Authentication failed: ${error.message}` });
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
        console.log('🌐 Starting Telegram Widget authentication...');
        set({ isLoading: true, error: null });
        
        try {
          // 🟢 ОБНОВЛЕННЫЙ ПУТЬ: Добавлен префикс /api/
          const response = await apiClient.post('/api/auth/widget', widgetData);
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
          
          console.log('✅ Telegram Widget authentication successful');
          
          return {
            success: true,
            user,
            token
          };
        } catch (error: any) {
          console.error('❌ Telegram Widget authentication error:', error);
          
          const errorMessage = error.response?.data?.message || 'Telegram Widget authentication error';
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
        console.log('🛜 testAuth called');
        set({ isLoading: true, error: null });
        
        try {
          // 🟢 ОБНОВЛЕННЫЙ ПУТЬ: Добавлен префикс /api/
          const response = await apiClient.post('/api/auth/test');
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
          
          console.log('✅ Test authentication successful:', user);
        } catch (error: any) {
          console.error('❌ Test authentication failed:', error);
          set({ 
            error: 'Test authentication failed',
            isLoading: false 
          });
          throw error;
        }
      },

      /**
       * Логин с готовыми данными
       */
      login: (user: User, token: string) => {
        console.log('🔐 Login with user:', user);
        
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
        console.log('🚪 Logout called');
        
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

      setToken: (token: string | null) => {
        console.log('🔑 setToken called with:', token);
        set({ token });
      },

      setUser: (user: User | null) => {
        console.log('👤 setUser called with:', user);
        set({ user });
      },

      setInitialized: (initialized: boolean) => {
        console.log('🏁 setInitialized called with:', initialized);
        set({ isInitialized: initialized });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💾 Storage rehydrated', state);
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