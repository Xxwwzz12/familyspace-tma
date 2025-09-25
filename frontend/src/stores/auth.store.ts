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
  initializeAuth: (initDataRaw: string | null) => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  testAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      /**
       * Инициализирует аутентификацию пользователя
       * @param initDataRaw - Сырые данные инициализации Telegram Web App или null для тестовой аутентификации
       */
      initializeAuth: async (initDataRaw: string | null) => {
        console.log('🔄 initializeAuth called with initDataRaw:', initDataRaw);
        
        try {
          let response;
          
          if (initDataRaw) {
            // Настоящая Telegram аутентификация с использованием сырых данных
            console.log('🔐 Authenticating with Telegram initDataRaw');
            response = await apiClient.post('/auth/init', { initData: initDataRaw });
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
            isLoading: false 
          });
          
          console.log('✅ Authentication successful:', user);
        } catch (error) {
          console.error('❌ Authentication failed:', error);
          set({ isLoading: false });
        }
      },

      /**
       * Выполняет тестовую аутентификацию (без использования Telegram данных)
       */
      testAuth: async () => {
        console.log('🛜 testAuth called');
        try {
          const response = await apiClient.post('/auth/test');
          const { user, token } = response.data;
          
          // Сохраняем токен
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }
          
          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false 
          });
          
          console.log('✅ Test authentication successful:', user);
        } catch (error) {
          console.error('❌ Test authentication failed:', error);
          set({ isLoading: false });
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
          isLoading: false 
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
          isLoading: false 
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
        
        set({ token });
      },

      /**
       * Устанавливает данные пользователя
       * @param user - Данные пользователя или null для очистки
       */
      setUser: (user: User | null) => {
        console.log('👤 setUser called with:', user);
        set({ user });
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
            setUser: currentState.setUser
          };
        }
        return currentState;
      }
    }
  )
);