// frontend/src/components/TelegramAuthWidget.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import './TelegramAuthWidget.css';

interface TelegramAuthWidgetProps {
  onAuthSuccess?: (userData: any) => void;
  onAuthError?: (error: string) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  showUserPhoto?: boolean;
}

// Глобальный интерфейс для Telegram Widget
declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth?: (user: any) => void;
    };
    onTelegramAuth?: (userData: any) => void;
  }
}

export const TelegramAuthWidget: React.FC<TelegramAuthWidgetProps> = ({
  onAuthSuccess,
  onAuthError,
  buttonSize = 'large',
  showUserPhoto = false
}) => {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loginWithTelegramWidget } = useAuthStore();
  
  // Глобальный callback для обработки аутентификации
  const handleTelegramAuth = async (userData: any) => {
    try {
      console.log('📨 Received Telegram Widget auth data:', userData);
      setIsLoading(true);
      
      const result = await loginWithTelegramWidget(userData);
      
      if (result.success) {
        console.log('✅ Telegram Widget auth successful');
        onAuthSuccess?.(userData);
      } else {
        const errorMsg = result.error || 'Authentication failed';
        console.error('❌ Telegram Widget auth failed:', errorMsg);
        setError(errorMsg);
        onAuthError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unexpected authentication error';
      console.error('❌ Unexpected auth error:', err);
      setError(errorMsg);
      onAuthError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Регистрируем глобальную функцию для callback Telegram
    window.onTelegramAuth = handleTelegramAuth;

    let script: HTMLScriptElement | null = null;
    let widgetDiv: HTMLDivElement | null = null;
    const container = widgetContainerRef.current;

    const initializeWidget = () => {
      if (!container) {
        setError('Widget container not found');
        return;
      }

      try {
        // ОЧИСТКА: Аккуратно удаляем предыдущий виджет
        const existingScript = document.getElementById('telegram-widget-script');
        const existingWidget = container.querySelector('.telegram-widget');
        
        if (existingScript?.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }
        if (existingWidget?.parentNode) {
          existingWidget.parentNode.removeChild(existingWidget);
        }

        // СОЗДАНИЕ: Создаем контейнер для виджета
        widgetDiv = document.createElement('div');
        widgetDiv.className = 'telegram-widget';
        container.appendChild(widgetDiv);

        // ЗАГРУЗКА: Динамически загружаем скрипт виджета
        script = document.createElement('script');
        script.id = 'telegram-widget-script';
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', 'Family_Space_MVP_bot');
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', showUserPhoto ? 'true' : 'false');
        
        script.onload = () => {
          console.log('✅ Telegram Widget script loaded successfully');
          setIsLoading(false);
          setError(null);
        };
        
        script.onerror = () => {
          const errorMsg = 'Failed to load Telegram Widget script';
          console.error('❌', errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          onAuthError?.(errorMsg);
        };

        document.body.appendChild(script);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize widget';
        console.error('❌ Widget initialization error:', err);
        setError(errorMsg);
        setIsLoading(false);
        onAuthError?.(errorMsg);
      }
    };

    // Задержка для гарантии готовности DOM
    const timer = setTimeout(initializeWidget, 100);
    
    return () => {
      clearTimeout(timer);
      
      // КОРРЕКТНАЯ ОЧИСТКА: Удаляем только наши элементы :cite[6]
      if (script?.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      if (widgetDiv?.parentNode) {
        widgetDiv.parentNode.removeChild(widgetDiv);
      }
      
      // Осторожно с глобальной функцией
      if (window.onTelegramAuth === handleTelegramAuth) {
        delete window.onTelegramAuth;
      }
    };
  }, [loginWithTelegramWidget, onAuthSuccess, onAuthError, buttonSize, showUserPhoto]);

  const reloadWidget = () => {
    setError(null);
    setIsLoading(true);
    // Принудительная переинициализация через небольшой таймаут
    setTimeout(() => {
      const initializeWidget = () => {
        const container = widgetContainerRef.current;
        if (!container) return;

        const existingScript = document.getElementById('telegram-widget-script');
        const existingWidget = container.querySelector('.telegram-widget');
        
        if (existingScript?.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }
        if (existingWidget?.parentNode) {
          existingWidget.parentNode.removeChild(existingWidget);
        }

        // Пересоздаем виджет
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'telegram-widget';
        container.appendChild(widgetDiv);

        const script = document.createElement('script');
        script.id = 'telegram-widget-script';
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', 'Family_Space_MVP_bot');
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', showUserPhoto ? 'true' : 'false');

        script.onload = () => {
          setIsLoading(false);
          setError(null);
        };

        script.onerror = () => {
          setError('Failed to reload Telegram widget');
          setIsLoading(false);
        };

        document.body.appendChild(script);
      };
      initializeWidget();
    }, 300);
  };

  return (
    <div className="telegram-auth-widget">
      <h3>Войти через Telegram</h3>
      <p>Авторизуйтесь для доступа к FamilySpace</p>
      
      <div 
        ref={widgetContainerRef} 
        className="widget-container"
        style={{ minHeight: '50px', position: 'relative' }}
      />
      
      {/* Состояние загрузки */}
      {isLoading && (
        <div className="widget-loading-state">
          <div className="loading-spinner"></div>
          <span>Загрузка виджета Telegram...</span>
        </div>
      )}
      
      {/* Состояние ошибки */}
      {error && !isLoading && (
        <div className="widget-error-state">
          <div className="error-message">
            <strong>Ошибка:</strong> {error}
          </div>
          <button 
            className="reload-button"
            onClick={reloadWidget}
            type="button"
          >
            🔄 Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
};