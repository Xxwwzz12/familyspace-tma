import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import './TelegramAuthWidget.css';

interface TelegramAuthWidgetProps {
  onAuthSuccess?: (userData: any) => void;
  onAuthError?: (error: any) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  showUserPhoto?: boolean;
}

// Глобальный интерфейс для Telegram Widget
declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth?: (user: any) => void;
    };
  }
}

const TelegramAuthWidget: React.FC<TelegramAuthWidgetProps> = ({
  onAuthSuccess,
  onAuthError,
  buttonSize = 'large',
  showUserPhoto = false
}) => {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const { loginWithTelegramWidget } = useAuthStore();

  // Настройки виджета
  const BOT_USERNAME = 'Family_Space_MVP_bot'; // Заменить на актуальный username бота
  const WIDGET_SCRIPT_URL = 'https://telegram.org/js/telegram-widget.js?22';

  useEffect(() => {
    loadWidget();
    
    return () => {
      // Очистка при размонтировании
      if (window.TelegramLoginWidget) {
        delete window.TelegramLoginWidget.dataOnauth;
      }
    };
  }, []);

  const loadWidget = () => {
    if (!widgetContainerRef.current) {
      setWidgetError('Widget container not found');
      return;
    }

    // Проверяем, не загружен ли виджет уже
    if (isWidgetLoaded) {
      return;
    }

    // Проверяем, не загружен ли скрипт уже
    if (document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`)) {
      initializeWidget();
      return;
    }

    // Создаем скрипт виджета
    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    
    // Глобальная функция обратного вызова для виджета
    window.TelegramLoginWidget = {
      dataOnauth: (user: any) => handleTelegramAuth(user)
    };

    script.onload = () => {
      console.log('✅ Telegram Widget script loaded');
      initializeWidget();
    };

    script.onerror = () => {
      console.error('❌ Failed to load Telegram Widget script');
      setWidgetError('Failed to load Telegram authentication');
      onAuthError?.('Widget script loading failed');
    };

    document.body.appendChild(script);
  };

  const initializeWidget = () => {
    if (!widgetContainerRef.current) return;

    // Очищаем контейнер перед инициализацией
    widgetContainerRef.current.innerHTML = '';

    // Создаем элемент для виджета
    const widgetScript = document.createElement('script');
    widgetScript.async = true;
    widgetScript.setAttribute('data-telegram-login', BOT_USERNAME);
    widgetScript.setAttribute('data-size', buttonSize);
    widgetScript.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    widgetScript.setAttribute('data-request-access', 'write');
    widgetScript.setAttribute('data-userpic', showUserPhoto ? 'true' : 'false');
    
    // Используем текущий URL для redirect (или можно указать конкретный)
    const redirectUrl = encodeURIComponent(window.location.href);
    widgetScript.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram-widget`);

    widgetContainerRef.current.appendChild(widgetScript);
    setIsWidgetLoaded(true);
    
    console.log('🎯 Telegram Widget initialized');
  };

  const handleTelegramAuth = async (userData: any) => {
    console.log('🔐 Telegram Widget auth data received:', userData);
    
    try {
      // Отправляем данные на бэкенд для верификации и создания сессии
      const result = await loginWithTelegramWidget(userData);
      
      if (result.success) {
        console.log('✅ Telegram Widget authentication successful');
        onAuthSuccess?.(userData);
      } else {
        console.error('❌ Telegram Widget authentication failed:', result.error);
        setWidgetError(result.error || 'Authentication failed');
        onAuthError?.(result.error);
      }
    } catch (error: any) {
      console.error('❌ Telegram Widget authentication error:', error);
      setWidgetError(error.message || 'Authentication error');
      onAuthError?.(error);
    }
  };

  const reloadWidget = () => {
    setIsWidgetLoaded(false);
    setWidgetError(null);
    loadWidget();
  };

  return (
    <div className="telegram-auth-widget">
      {widgetError ? (
        <div className="widget-error">
          <div className="error-message">
            <strong>Ошибка:</strong> {widgetError}
          </div>
          <button 
            className="reload-button"
            onClick={reloadWidget}
          >
            🔄 Попробовать снова
          </button>
        </div>
      ) : (
        <div className="widget-container">
          <div 
            ref={widgetContainerRef}
            className="widget-placeholder"
          >
            {!isWidgetLoaded && (
              <div className="widget-loading">
                <div className="loading-spinner"></div>
                <div>Загрузка Telegram Widget...</div>
              </div>
            )}
          </div>
          
          <div className="widget-info">
            <p>После авторизации вы будете перенаправлены обратно в приложение</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramAuthWidget;