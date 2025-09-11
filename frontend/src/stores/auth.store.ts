import { create } from 'zustand';

// Определяем интерфейс состояния хранилища
interface AuthState {
  token: string | null;
  user: object | null;
  setCredentials: (token: string, user: object) => void;
  logout: () => void;
}

// Создаем хранилище с использованием Zustand
export const useAuthStore = create<AuthState>((set) => ({
  // Начальное состояние: пытаемся прочитать токен из localStorage
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,

  // Действие для установки учетных данных
  setCredentials: (token: string, user: object) => {
    // Сохраняем токен в localStorage (только в браузере)
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    // Обновляем состояние хранилища
    set({ token, user });
  },

  // Действие для выхода из системы
  logout: () => {
    // Удаляем токен из localStorage (только в браузере)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    // Сбрасываем состояние хранилища
    set({ token: null, user: null });
  },
}));