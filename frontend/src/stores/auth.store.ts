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
  isLoading: boolean;
  isAuthenticated: boolean;
  initializeAuth: () => Promise<void>;
  login: (userData: User, token: string) => void;
  logout: () => void;
  testAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: true,
      isAuthenticated: false,

      initializeAuth: async () => {
        console.log('🔄 initializeAuth called');
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          console.log('❌ No token found in localStorage');
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        console.log('✅ Token found in localStorage, validating...');
        
        try {
          const response = await apiClient.get('/user/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('✅ Token validation successful, user:', response.data);
          
          set({ 
            token,
            user: response.data,
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          console.error('❌ Token validation failed:', error);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          set({ 
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false 
          });
        }
      },

      login: (userData, token) => {
        console.log('🔐 login action called with user:', userData);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        
        set({ 
          user: userData, 
          token,
          isAuthenticated: true,
          isLoading: false 
        });
      },

      logout: () => {
        console.log('🚪 logout action called');
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          isLoading: false 
        });
      },

      testAuth: async (): Promise<void> => {
        console.log('🛜 testAuth called');
        try {
          const response = await apiClient.post('/auth/test'); // Используем POST без префикса /api
          const { token, user } = response.data;
          console.log('✅ testAuth success', token, user);
          
          // Обновляем хранилище с новыми данными
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
          }
          
          set({
            token,
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          console.error('❌ testAuth failed:', error);
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💾 Storage rehydrated', state);
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        initializeAuth: currentState.initializeAuth,
        login: currentState.login,
        logout: currentState.logout,
        testAuth: currentState.testAuth
      })
    }
  )
);