// src/hooks/useApi.ts
import apiClient from '@/utils/apiClient';

export const useApi = () => {
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

  return { get, post, patch, delete: del };
};