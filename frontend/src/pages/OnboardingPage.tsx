import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  setMainButtonParams,
  onMainButtonClick,
  offMainButtonClick,
  mountMainButton,
  isMainButtonMounted,
  hapticFeedback
} from '@telegram-apps/sdk';
import { telegramService, isTMAavailable } from '../services/telegramService';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../stores/auth.store';

const OnboardingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { authWithTelegram } = useApi();
  const { login, isAuthenticated, testAuth } = useAuthStore();

  // Проверка аутентификации и перенаправление
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Обработчик входа через Telegram (TMA-режим)
  const handleTelegramLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      hapticFeedback.impactOccurred('medium');
      const initData = await telegramService.initTelegramAuth();
      const response = await authWithTelegram(initData);
      const { user, token } = response;
      login(user, token);
    } catch (err: any) {
      console.error(err);
      hapticFeedback.impactOccurred('heavy');
      setError(err?.message ?? 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [authWithTelegram, login]);

  // Обработчик тестовой аутентификации
  const handleTestAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await testAuth();
      // После успешной тестовой аутентификации создаем тестового пользователя
      const testUser = {
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser'
      };
      const testToken = 'test-token-' + Date.now();
      login(testUser, testToken);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Ошибка тестовой аутентификации');
    } finally {
      setLoading(false);
    }
  }, [testAuth, login]);

  // Определяем режим работы (TMA или fallback)
  const isTmaMode = isTMAavailable();

  // Инициализация main button
  useEffect(() => {
    let offClick: (() => void) | undefined;

    try {
      if (mountMainButton.isAvailable?.() && !isMainButtonMounted?.()) {
        mountMainButton();
      }
    } catch (e) {
      console.warn('Main button mount failed', e);
    }

    // Настройка кнопки в зависимости от режима
    if (setMainButtonParams.isAvailable?.()) {
      setMainButtonParams({
        text: isTmaMode ? 'Войти через Telegram' : 'Тестовый вход',
        isVisible: true,
        isEnabled: true,
        isLoaderVisible: false,
      });
    }

    // Подписка на клик в зависимости от режима
    const handler = isTmaMode ? handleTelegramLogin : handleTestAuth;
    if (onMainButtonClick.isAvailable?.()) {
      offClick = onMainButtonClick(handler);
    }

    return () => {
      try {
        if (typeof offClick === 'function') offClick();
        if (offMainButtonClick.isAvailable?.()) offMainButtonClick(handler);
        if (setMainButtonParams.isAvailable?.()) setMainButtonParams({ isVisible: false });
      } catch (e) {
        console.warn('Cleanup failed', e);
      }
    };
  }, [isTmaMode, handleTelegramLogin, handleTestAuth]);

  // Обновление состояния кнопки
  useEffect(() => {
    if (setMainButtonParams.isAvailable?.()) {
      setMainButtonParams({
        text: loading ? 'Загрузка...' : (isTmaMode ? 'Войти через Telegram' : 'Тестовый вход'),
        isLoaderVisible: loading,
        isEnabled: !loading,
      });
    }
  }, [loading, isTmaMode]);

  // Если пользователь аутентифицирован, ничего не показываем
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="onboarding-page">
      <h1>Добро пожаловать!</h1>
      <p>Для начала работы {isTmaMode ? 'войдите через Telegram' : 'выполните тестовый вход'}</p>
      
      {/* Fallback-кнопка для нетематического окружения */}
      {!isTmaMode && (
        <button 
          onClick={handleTestAuth} 
          disabled={loading}
          className="fallback-login-btn"
        >
          {loading ? 'Загрузка...' : 'Test Auth'}
        </button>
      )}
      
      {error && (
        <div className="error-message">
          <p>Ошибка: {error}</p>
          <button onClick={() => setError(null)}>Закрыть</button>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;