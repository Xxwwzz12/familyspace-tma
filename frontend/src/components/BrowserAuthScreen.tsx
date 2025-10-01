import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { TelegramAuthWidget } from './TelegramAuthWidget'; // Исправлен импорт
import './BrowserAuthScreen.css';

const BrowserAuthScreen: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const { error, clearError } = useAuthStore();

  // Очищаем ошибки при монтировании компонента
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleTelegramAuthSuccess = (userData: any) => {
    console.log('✅ Telegram Widget auth success:', userData);
    // Автоматическая переадресация произойдет после обновления состояния в хранилище
  };

  const handleTelegramAuthError = (error: any) => {
    console.error('❌ Telegram Widget auth error:', error);
  };

  const openInTelegram = () => {
    // Ссылка для открытия в Telegram App
    const botUsername = 'Family_Space_MVP_bot'; // Заменить на актуальный username бота
    const telegramUrl = `https://t.me/${botUsername}/start`;
    
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className="browser-auth-screen">
      <div className="auth-container">
        {/* Заголовок и описание */}
        <div className="auth-header">
          <h1>Добро пожаловать в FamilySpace</h1>
          <p>Приложение для организации семейных дел и событий</p>
        </div>

        {/* Основной блок аутентификации */}
        <div className="auth-main">
          <div className="auth-card">
            <h2>Войти через Telegram</h2>
            <p>Используйте свой Telegram аккаунт для входа в приложение</p>
            
            {/* Компонент Telegram Widget */}
            <div className="widget-container">
              <TelegramAuthWidget
                onAuthSuccess={handleTelegramAuthSuccess}
                onAuthError={handleTelegramAuthError}
              />
            </div>

            {/* Альтернативные варианты */}
            <div className="auth-alternatives">
              <button 
                className="alternative-btn"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                📱 Открыть в Telegram App
              </button>
              
              <button 
                className="alternative-btn secondary"
                onClick={openInTelegram}
              >
                Перейти в Telegram
              </button>
            </div>

            {/* Инструкции по использованию */}
            {showInstructions && (
              <div className="instructions">
                <h3>Как использовать:</h3>
                <ol>
                  <li>Откройте приложение в Telegram для полного функционала</li>
                  <li>Или войдите через виджет выше для базового доступа</li>
                  <li>Все данные синхронизируются между устройствами</li>
                </ol>
              </div>
            )}

            {/* Отображение ошибок */}
            {error && (
              <div className="auth-error">
                <strong>Ошибка:</strong> {error}
              </div>
            )}
          </div>
        </div>

        {/* Информация о приложении */}
        <div className="auth-footer">
          <div className="app-features">
            <h3>Что можно делать в FamilySpace:</h3>
            <ul>
              <li>📅 Создавать общий семейный календарь</li>
              <li>✅ Вести списки задач и покупок</li>
              <li>👥 Приглашать членов семьи</li>
              <li>🔔 Получать напоминания о событиях</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserAuthScreen;