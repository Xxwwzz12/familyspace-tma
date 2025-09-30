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
  isInitialized: boolean; // Добавлено: флаг завершения инициализации
  error: string | null;
  initializeAuth: (initDataRaw: string | null) => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  testAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  setInitialized: (initialized: boolean) => void; // Добавлено: метод для установки isInitialized
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false, // Начинаем с false
      error: null,

      /**
       * Инициализирует аутентификацию пользователя
       * @param initDataRaw - Сырые данные инициализации Telegram Web App или null для тестовой аутентификации
       */
      initializeAuth: async (initDataRaw: string | null) => {
        console.log('🔄 initializeAuth called with initDataRaw:', initDataRaw);
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔐 Аутентификация запущена');
          
          // 🔴 ВРЕМЕННО: Закомментировать вызов API
          // const response = await apiClient.post('/auth/init', { 
          //   initData: initDataRaw 
          // });
          
          // 🟢 ВРЕМЕННО: Установить тестового пользователя
          console.log('🔧 ВРЕМЕННО: Аутентификация отключена, устанавливаем тестового пользователя');
          
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
            isLoading: false,
            isInitialized: true, // 🟢 КРИТИЧЕСКИ ВАЖНО: Установить isInitialized
            error: null
          });
          
          console.log('✅ ВРЕМЕННО: Аутентификация завершена, пользователь установлен');

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'AUTH_DISABLED_TEMPORARILY_WITH_INIT',
              user: testUser,
              initData: initDataRaw,
              timestamp: new Date().toISOString(),
              storeState: 'TEST_USER_SET_AND_INITIALIZED'
            };
          }
        } catch (error: any) {
          console.error('❌ Ошибка аутентификации:', error);
          
          // Даже при ошибке завершаем инициализацию
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
            isLoading: false,
            isInitialized: true, // 🟢 КРИТИЧЕСКИ ВАЖНО: Установить isInitialized даже при ошибке
            error: null
          });
          
          console.log('✅ ВРЕМЕННО: Установлен тестовый пользователь из-за ошибки:', testUser);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'AUTH_ERROR_BUT_INITIALIZED',
              user: testUser,
              initData: initDataRaw,
              timestamp: new Date().toISOString(),
              error: error.message,
              storeState: 'TEST_USER_SET_DUE_TO_ERROR_AND_INITIALIZED'
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
          // 🔴 ВРЕМЕННО: Закомментировать вызов API
          console.log('🔧 ВРЕМЕННО: Тестовая аутентификация отключена, устанавливаем тестового пользователя');
          
          // 🟢 ВРЕМЕННО: Установить тестового пользователя
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
            isLoading: false,
            isInitialized: true, // 🟢 КРИТИЧЕСКИ ВАЖНО: Установить isInitialized
            error: null
          });
          
          console.log('✅ ВРЕМЕННО: Установлен тестовый пользователь через testAuth:', testUser);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'TEST_AUTH_DISABLED_TEMPORARILY_WITH_INIT',
              user: testUser,
              timestamp: new Date().toISOString(),
              storeState: 'TEST_USER_SET_VIA_TEST_AUTH_AND_INITIALIZED'
            };
          }
        } catch (error: any) {
          console.error('❌ Ошибка тестовой аутентификации:', error);
          
          // Даже при ошибке завершаем инициализацию
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
            isLoading: false,
            isInitialized: true, // 🟢 КРИТИЧЕСКИ ВАЖНО: Установить isInitialized даже при ошибке
            error: null
          });
          
          console.log('✅ ВРЕМЕННО: Установлен тестовый пользователь из-за ошибки тестовой аутентификации:', testUser);

          // 💾 Сохранить данные для отображения на странице
          if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
              status: 'TEST_AUTH_ERROR_BUT_INITIALIZED',
              user: testUser,
              timestamp: new Date().toISOString(),
              error: error.message,
              storeState: 'TEST_USER_SET_DUE_TO_TEST_ERROR_AND_INITIALIZED'
            };
          }
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
          isInitialized: true, // При логине тоже помечаем как инициализированное
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
          isInitialized: true, // При логауте сохраняем isInitialized = true, так как приложение уже инициализировано
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
        if (state && typeof state === 'object') {
          // При восстановлении состояния помечаем как инициализированное
          return { ...state, isLoading: false, isInitialized: true, error: null };
        }
        return state;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isInitialized: state.isInitialized // Сохраняем состояние инициализации
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