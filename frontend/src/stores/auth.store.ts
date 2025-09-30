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
  error: string | null;
  initializeAuth: (initDataRaw: string | null) => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  testAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
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
            // 🟢 РАСКОММЕНТИРОВАН нормальный вызов API
            console.log('🔐 Отправляем аутентификацию на бэкенд...');
            console.log('📤 Sending initData length:', initDataRaw.length);
            
            response = await apiClient.post('/auth/init', { 
              initData: initDataRaw 
            });
            
            console.log('✅ Ответ от бэкенда:', response);
          } else {
            // Тестовая аутентификация (fallback)
            console.log('🧪 Using test authentication (initDataRaw is null)');
            response = await apiClient.post('/auth/test');
          }
          
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
            error: null
          });
          
          console.log('✅ Authentication successful:', user);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'AUTH_SUCCESS',
              user: user,
              initData: initDataRaw,
              timestamp: new Date().toISOString(),
              storeState: 'AUTHENTICATED_VIA_BACKEND'
            };
          }
        } catch (error: any) {
          console.error('❌ Ошибка аутентификации:', error);
          
          // Детальный анализ ошибки
          if (error.response) {
            console.error('📊 Детали ошибки:', {
              status: error.response.status,
              data: error.response.data,
              headers: error.response.headers
            });
            
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
          
          // 🔴 ВРЕМЕННО: все равно устанавливаем тестового пользователя
          // чтобы остановить перезагрузку
          console.log('🔧 ВРЕМЕННО: Устанавливаем тестового пользователя из-за ошибки');
          const testUser = {
            id: '303987836',
            firstName: 'Егор',
            lastName: 'Гуревич',
            username: 'gurevichegor'
          };
          
          const testToken = 'test-token-' + Date.now();
          
          // Сохраняем токен
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', testToken);
          }
          
          set({ 
            user: testUser, 
            token: testToken,
            isAuthenticated: true, 
            isLoading: false
          });
          
          console.log('✅ ВРЕМЕННО: Установлен тестовый пользователь из-за ошибки:', testUser);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'AUTH_FAILED_BUT_TEST_USER_SET',
              user: testUser,
              initData: initDataRaw,
              timestamp: new Date().toISOString(),
              error: error.message,
              storeState: 'TEST_USER_SET_DUE_TO_ERROR'
            };
          }
        }
      },

      /**
       * Выполняет тестовую аутентификацию (без использования Telegram данных)
       */
      testAuth: async () => {
        console.log('🛜 testAuth called');
        set({ isLoading: true, error: null });
        
        try {
          // 🟢 РАСКОММЕНТИРОВАН нормальный вызов API
          console.log('🔐 Отправляем тестовую аутентификацию на бэкенд...');
          const response = await apiClient.post('/auth/test');
          const { user, token } = response.data;
          
          console.log('✅ Ответ от бэкенда (test):', response);
          
          // Сохраняем токен
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }
          
          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            error: null
          });
          
          console.log('✅ Test authentication successful:', user);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'TEST_AUTH_SUCCESS',
              user: user,
              timestamp: new Date().toISOString(),
              storeState: 'AUTHENTICATED_VIA_TEST'
            };
          }
        } catch (error: any) {
          console.error('❌ Ошибка тестовой аутентификации:', error);
          
          // Детальный анализ ошибки
          if (error.response) {
            console.error('📊 Детали ошибки (test):', {
              status: error.response.status,
              data: error.response.data,
              headers: error.response.headers
            });
            
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            set({ error: `Test authentication failed: ${status} - ${message}` });
          } else {
            set({ error: `Test authentication failed: ${error.message}` });
          }
          
          // 🔴 ВРЕМЕННО: все равно устанавливаем тестового пользователя
          console.log('🔧 ВРЕМЕННО: Устанавливаем тестового пользователя из-за ошибки тестовой аутентификации');
          const testUser = {
            id: '303987836',
            firstName: 'Егор',
            lastName: 'Гуревич',
            username: 'gurevichegor'
          };
          
          const testToken = 'test-token-' + Date.now();
          
          // Сохраняем токен
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', testToken);
          }
          
          set({ 
            user: testUser, 
            token: testToken,
            isAuthenticated: true, 
            isLoading: false
          });
          
          console.log('✅ ВРЕМЕННО: Установлен тестовый пользователь из-за ошибки тестовой аутентификации:', testUser);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'TEST_AUTH_FAILED_BUT_TEST_USER_SET',
              user: testUser,
              timestamp: new Date().toISOString(),
              error: error.message,
              storeState: 'TEST_USER_SET_DUE_TO_TEST_ERROR'
            };
          }
          
          throw error;
        }
      },

      /**
       * Вход пользователя в систему
       * @param user - Данные пользователя
       * @param token - JWT токен аутентификации
       */
      login: (user: User, token: string) => {
        console.log('🔐 login action called with user:', user);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
        
        set({ 
          user, 
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      },

      /**
       * Выход пользователя из системы
       */
      logout: () => {
        console.log('🚪 logout action called');
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },

      /**
       * Устанавливает токен аутентификации
       * @param token - JWT токен или null для очистки
       */
      setToken: (token: string | null) => {
        console.log('🔑 setToken called with:', token);
        
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        
        set({ token, error: null });
      },

      /**
       * Устанавливает данные пользователя
       * @param user - Данные пользователя или null для очистки
       */
      setUser: (user: User | null) => {
        console.log('👤 setUser called with:', user);
        set({ user, error: null });
      },

      /**
       * Очищает ошибку аутентификации
       */
      clearError: () => {
        console.log('🧹 Clearing error');
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💾 Storage rehydrated', state);
        if (state && typeof state === 'object') {
          return { ...state, isLoading: false, error: null };
        }
        return state;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user
      }),
      merge: (persistedState, currentState) => {
        if (persistedState && typeof persistedState === 'object') {
          return {
            ...currentState,
            ...persistedState,
            initializeAuth: currentState.initializeAuth,
            login: currentState.login,
            logout: currentState.logout,
            testAuth: currentState.testAuth,
            setToken: currentState.setToken,
            setUser: currentState.setUser,
            clearError: currentState.clearError
          };
        }
        return currentState;
      }
    }
  )
);