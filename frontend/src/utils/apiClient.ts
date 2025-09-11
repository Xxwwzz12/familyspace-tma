// src/utils/apiClient.ts
import axios from 'axios';

// Создаем экземпляр Axios с базовым URL из переменных окружения
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Добавляем интерсептор для подстановки JWT-токена в заголовки
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwtToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Экспортируем созданный клиент
export default apiClient;