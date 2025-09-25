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
  initializeAuth: (initData: string | null) => Promise<void>;
  login: (user: User, token: string) => void;
  logout: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      initializeAuth: async (initData: string | null) => {
        console.log('🔄 initializeAuth called with initData:', initData);
        
        try {
          let response;
          
          if (initData) {
            // Настоящая Telegram аутентификация
            console.log('🔐 Authenticating with Telegram initData');
            response = await apiClient.post('/auth/init', { initData });
          } else {
            // Тестовая аутентификация (fallback)
            console.log('🧪 Using test authentication');
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

      setToken: (token: string | null) => {
        console.log('🔑 setToken called with:', token);
        
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        
        set({ token });
      },

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
            setToken: currentState.setToken,
            setUser: currentState.setUser
          };
        }
        return currentState;
      }
    }
  )
);