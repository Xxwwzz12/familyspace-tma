import axios from 'axios';

// Базовый URL API: используем переменную окружения VITE_API_URL, если не задана - localhost:3000/api
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор для логирования (опционально, для отладки)
apiClient.interceptors.request.use((request) => {
  console.log(`🛜 Отправка запроса: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
  return request;
});

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Перенаправление на онбординг при 401 ошибке
      localStorage.removeItem('token');
      window.location.href = '/onboarding';
    }
    return Promise.reject(error);
  }
);