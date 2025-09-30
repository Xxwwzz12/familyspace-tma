// src/pages/HomePage.tsx
import React from 'react';
import { useAuthStore } from '../stores/auth.store';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  // Временное состояние - позже заменим на реальные данные из API
  const [hasFamily, setHasFamily] = React.useState(false);
  const [familyInfo, setFamilyInfo] = React.useState(null);

  if (!isAuthenticated || !user) {
    return <div>Пожалуйста, войдите в систему</div>;
  }

  return (
    <div className="home-page">
      {/* Шапка с приветствием */}
      <header className="home-header">
        <div className="user-info">
          <div className="avatar-placeholder">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="user-details">
            <h1>Добро пожаловать, {user.firstName}!</h1>
            <p className="username">@{user.username}</p>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="home-content">
        {/* Секция семьи */}
        <section className="family-section">
          <h2>Ваша семья</h2>
          
          {!hasFamily ? (
            <div className="no-family">
              <p>У вас пока нет семьи. Создайте новую или присоединитесь к существующей.</p>
              <div className="family-actions">
                <button 
                  className="btn-primary"
                  onClick={() => console.log('Создать семью')}
                >
                  🏠 Создать семью
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => console.log('Вступить в семью')}
                >
                  🔗 Вступить в семью
                </button>
              </div>
            </div>
          ) : (
            <div className="family-info">
              <div className="family-header">
                <h3>Семья "Гуревичи"</h3>
                <span className="member-count">4 участника</span>
              </div>
              <div className="family-actions">
                <button className="btn-outline">📅 События</button>
                <button className="btn-outline">👥 Участники</button>
                <button className="btn-outline">⚙️ Настройки</button>
              </div>
            </div>
          )}
        </section>

        {/* Быстрые действия */}
        <section className="quick-actions">
          <h2>Быстрые действия</h2>
          <div className="actions-grid">
            <div className="action-card" onClick={() => console.log('Календарь')}>
              <div className="action-icon">📅</div>
              <span>Календарь</span>
            </div>
            <div className="action-card" onClick={() => console.log('Задачи')}>
              <div className="action-icon">✅</div>
              <span>Задачи</span>
            </div>
            <div className="action-card" onClick={() => console.log('Покупки')}>
              <div className="action-icon">🛒</div>
              <span>Список покупок</span>
            </div>
            <div className="action-card" onClick={() => console.log('Напоминания')}>
              <div className="action-icon">⏰</div>
              <span>Напоминания</span>
            </div>
          </div>
        </section>

        {/* Недавняя активность */}
        <section className="recent-activity">
          <h2>Недавняя активность</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon">➕</span>
              <div className="activity-content">
                <p>Егор добавил новое событие</p>
                <span className="activity-time">2 часа назад</span>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-icon">✅</span>
              <div className="activity-content">
                <p>Мария завершила задачу</p>
                <span className="activity-time">5 часов назад</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;