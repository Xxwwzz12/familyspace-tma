import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, AuthResult } from '../services/auth.service';
import { Environment } from '../utils/environment';

interface User {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  authMethod: 'telegram' | 'widget' | 'none';
  error: string | null;
  
  // Обновленные методы
  initializeAuth: () => Promise<void>;
  loginWithTelegramWidget: (authData: any) => Promise<AuthResult>;
  logout: () => void;
  clearError: () => void;
  
  // Сеттеры для обратной совместимости
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,
      authMethod: 'none',
      error: null,

      // 🔄 ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ МЕТОД ИНИЦИАЛИЗАЦИИ
      initializeAuth: async () => {
        console.log('🔄 Starting auth initialization...');
        set({ isLoading: true, error: null });
        
        try {
          // Используем универсальный сервис аутентификации
          const result = await authService.authenticate();
          
          if (result.success) {
            console.log('✅ Authentication successful via:', Environment.getEnvironment());
            
            // Сохраняем токен для будущих запросов
            if (result.token) {
              authService.setAuthToken(result.token);
            }
            
            // Определяем метод аутентификации
            const authMethod = Environment.isTelegram() ? 'telegram' : 'widget';
            
            set({
              user: result.user,
              token: result.token,
              isAuthenticated: true,
              authMethod,
              error: null,
              isLoading: false,
              isInitialized: true
            });
            
            console.log(`🔐 Authenticated via ${authMethod}, user:`, result.user);
          } else {
            console.log('⚠️ Authentication required:', result.error);
            
            set({
              error: result.error || 'Authentication required',
              authMethod: 'none',
              isLoading: false,
              isInitialized: true
            });
          }
        } catch (error: any) {
          console.error('❌ Auth initialization error:', error);
          
          set({
            error: error.message || 'Initialization failed',
            authMethod: 'none',
            isLoading: false,
            isInitialized: true
          });
        }
      },

      // 🆕 МЕТОД ДЛЯ TELEGRAM WIDGET АУТЕНТИФИКАЦИИ
      loginWithTelegramWidget: async (authData: any): Promise<AuthResult> => {
        console.log('🌐 Starting Telegram Widget authentication...');
        set({ isLoading: true, error: null });
        
        try {
          const result = await authService.authenticateTelegramWidget(authData);
          
          if (result.success) {
            // Сохраняем токен и пользователя
            if (result.token) {
              authService.setAuthToken(result.token);
            }
            
            set({
              user: result.user,
              token: result.token,
              isAuthenticated: true,
              authMethod: 'widget',
              error: null,
              isLoading: false
            });
            
            console.log('✅ Telegram Widget authentication successful');
          } else {
            set({
              error: result.error || 'Widget authentication failed',
              isLoading: false
            });
          }
          
          return result;
        } catch (error: any) {
          console.error('❌ Telegram Widget authentication error:', error);
          
          const result: AuthResult = {
            success: false,
            error: error.message || 'Widget authentication failed'
          };
          
          set({
            error: result.error,
            isLoading: false
          });
          
          return result;
        }
      },

      // 🆕 МЕТОД ВЫХОДА
      logout: () => {
        console.log('🚪 Logging out user...');
        
        // Вызываем сервис для очистки токенов
        authService.logout();
        
        // Сбрасываем состояние хранилища
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          authMethod: 'none',
          error: null,
          isLoading: false
        });
        
        console.log('✅ User logged out');
      },

      // 🆕 МЕТОД ДЛЯ ОЧИСТКИ ОШИБОК
      clearError: () => {
        set({ error: null });
      },

      // 🔄 СЕТТЕРЫ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
      setUser: (user: User | null) => {
        console.log('👤 setUser called with:', user);
        set({ user });
      },

      setToken: (token: string | null) => {
        console.log('🔑 setToken called with:', token);
        
        if (token) {
          authService.setAuthToken(token);
        }
        
        set({ token });
      },

      setIsAuthenticated: (isAuthenticated: boolean) => {
        console.log('🔐 setIsAuthenticated called with:', isAuthenticated);
        set({ isAuthenticated });
      },

      setIsInitialized: (isInitialized: boolean) => {
        console.log('🏁 setIsInitialized called with:', isInitialized);
        set({ isInitialized });
      },

      setIsLoading: (isLoading: boolean) => {
        console.log('⏳ setIsLoading called with:', isLoading);
        set({ isLoading });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💾 Storage rehydrated', state);
        
        // При восстановлении состояния устанавливаем токен в сервис, если он есть
        if (state && state.token) {
          authService.setAuthToken(state.token);
        }
        
        if (state && typeof state === 'object') {
          return { 
            ...state, 
            isLoading: false,
            error: null
          };
        }
        return state;
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
        authMethod: state.authMethod
      }),
      merge: (persistedState, currentState) => {
        if (persistedState && typeof persistedState === 'object') {
          return {
            ...currentState,
            ...persistedState,
            initializeAuth: currentState.initializeAuth,
            loginWithTelegramWidget: currentState.loginWithTelegramWidget,
            logout: currentState.logout,
            clearError: currentState.clearError,
            setUser: currentState.setUser,
            setToken: currentState.setToken,
            setIsAuthenticated: currentState.setIsAuthenticated,
            setIsInitialized: currentState.setIsInitialized,
            setIsLoading: currentState.setIsLoading
          };
        }
        return currentState;
      }
    }
  )
);