// src/hooks/useApi.ts
import { apiClient } from '@/utils/apiClient'; // Исправлен импорт
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types/user';

export const useApi = () => {
  const { setToken, setUser, logout } = useAuthStore();

  const get = <T>(endpoint: string, config?: Parameters<typeof apiClient.get>[1]) => {
    return apiClient.get<T>(endpoint, config);
  };

  const post = <T>(endpoint: string, data?: any, config?: Parameters<typeof apiClient.post>[2]) => {
    return apiClient.post<T>(endpoint, data, config);
  };

  const patch = <T>(endpoint: string, data?: any, config?: Parameters<typeof apiClient.patch>[2]) => {
    return apiClient.patch<T>(endpoint, data, config);
  };

  const del = <T>(endpoint: string, config?: Parameters<typeof apiClient.delete>[1]) => {
    return apiClient.delete<T>(endpoint, config);
  };

  const authWithTelegram = async (initData: string): Promise<{ user: User; token: string }> => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/api/auth/init', { initData });
      
      // Сохраняем данные аутентификации в хранилище
      setToken(response.data.token);
      setUser(response.data.user);
      
      return response.data;
    } catch (error: any) {
      // При ошибке 401 сбрасываем состояние аутентификации
      if (error.response?.status === 401) {
        logout();
      }
      
      // Пробрасываем ошибку для обработки в компонентах
      throw error;
    }
  };

  return { get, post, patch, delete: del, authWithTelegram };
};