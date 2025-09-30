import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../utils/apiClient';

interface User {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initializeAuth: (initDataRaw: string | null) => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  testAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
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
            // 🟢 НОРМАЛЬНЫЙ ВЫЗОВ API - раскомментировать
            console.log('🔐 Отправляем аутентификацию на бэкенд...');
            
            response = await apiClient.post<AuthResponse>('/auth/init', { 
              initData: initDataRaw 
            });
            
            console.log('✅ Ответ от бэкенда:', response);
          } else {
            // Тестовая аутентификация (fallback)
            console.log('🧪 Using test authentication (initDataRaw is null)');
            response = await apiClient.post<AuthResponse>('/auth/test');
          }
          
          // Использовать реальные данные из ответа
          const { user, token } = response.data;
          
          // Сохраняем токен для будущих авторизованных запросов
          if (typeof window !== 'undefined') {
            localStorage.setItem('jwt_token', token);
          }
          
          // Устанавливаем токен в apiClient для будущих запросов
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            isInitialized: true,
            error: null
          });
          
          console.log('✅ Аутентификация успешна, пользователь:', user);

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
            
            // Обработка специфических ошибок
            if (error.response.status === 401) {
              console.error('🔐 Ошибка авторизации: неверная подпись Telegram');
              set({ error: 'Authentication failed: Invalid Telegram signature' });
            } else if (error.response.status === 500) {
              console.error('⚙️ Ошибка сервера при аутентификации');
              set({ error: 'Authentication failed: Server error' });
            } else {
              set({ error: `Authentication failed: ${error.response.status} - ${error.response.data?.message || error.response.statusText}` });
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
          
          // Завершаем инициализацию даже при ошибке
          set({ 
            isLoading: false, 
            isInitialized: true,
            isAuthenticated: false 
          });

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'AUTH_FAILED',
              initData: initDataRaw,
              timestamp: new Date().toISOString(),
              error: error.message,
              storeState: 'AUTH_FAILED_NO_TEST_USER'
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
          // 🟢 НОРМАЛЬНЫЙ ВЫЗОВ API - раскомментировать
          console.log('🔐 Отправляем тестовую аутентификацию на бэкенд...');
          const response = await apiClient.post<AuthResponse>('/auth/test');
          
          console.log('✅ Ответ от бэкенда (test):', response);
          
          // Использовать реальные данные из ответа
          const { user, token } = response.data;
          
          // Сохраняем токен для будущих авторизованных запросов
          if (typeof window !== 'undefined') {
            localStorage.setItem('jwt_token', token);
          }
          
          // Устанавливаем токен в apiClient для будущих запросов
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            isInitialized: true,
            error: null
          });
          
          console.log('✅ Тестовая аутентификация успешна, пользователь:', user);

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
          
          // Завершаем инициализацию даже при ошибке
          set({ 
            isLoading: false, 
            isInitialized: true,
            isAuthenticated: false 
          });

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'TEST_AUTH_FAILED',
              timestamp: new Date().toISOString(),
              error: error.message,
              storeState: 'TEST_AUTH_FAILED_NO_TEST_USER'
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
        
        // Сохраняем токен для будущих авторизованных запросов
        if (typeof window !== 'undefined') {
          localStorage.setItem('jwt_token', token);
        }
        
        // Устанавливаем токен в apiClient для будущих запросов
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
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
       * Выход пользователя из системы
       */
      logout: () => {
        console.log('🚪 logout action called');
        
        // Удаляем токен
        if (typeof window !== 'undefined') {
          localStorage.removeItem('jwt_token');
        }
        
        // Убираем токен из apiClient
        delete apiClient.defaults.headers.common['Authorization'];
        
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
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
          localStorage.setItem('jwt_token', token);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('jwt_token');
          delete apiClient.defaults.headers.common['Authorization'];
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

      /**
       * Устанавливает флаг инициализации
       * @param initialized - true если инициализация завершена
       */
      setInitialized: (initialized: boolean) => {
        console.log('🏁 setInitialized called with:', initialized);
        set({ isInitialized: initialized });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💾 Storage rehydrated', state);
        
        // При восстановлении состояния устанавливаем токен в apiClient, если он есть
        if (state && state.token && typeof window !== 'undefined') {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
        
        if (state && typeof state === 'object') {
          return { ...state, isLoading: false, error: null };
        }
        return state;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isInitialized: state.isInitialized
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
            clearError: currentState.clearError,
            setInitialized: currentState.setInitialized
          };
        }
        return currentState;
      }
    }
  )
);