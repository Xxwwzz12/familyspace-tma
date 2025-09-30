import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './stores/auth.store';
import { Environment } from './utils/environment';
import DevelopmentBanner from './components/DevelopmentBanner';
import DebugPanel from './components/DebugPanel';
import DebugInfo from './components/DebugInfo';
import BrowserAuthScreen from './components/BrowserAuthScreen';

function App() {
  const { 
    initializeAuth, 
    isInitialized, 
    isLoading, 
    isAuthenticated,
    authMethod,
    error
  } = useAuthStore();

  useEffect(() => {
    console.log('🏗️ App component mounted, initializing auth...');
    console.log('🌍 Environment:', Environment.getEnvironment());
    
    initializeAuth();
  }, [initializeAuth]);

  // Пока приложение инициализируется, показываем загрузку
  if (!isInitialized || isLoading) {
    console.log('⏳ Showing loading state', { isInitialized, isLoading, error });
    return (
      <div className="app-loading" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>Загрузка FamilySpace...</div>
        <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
          Окружение: {Environment.getEnvironment()}
        </div>
        {error && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            background: '#ffe6e6', 
            color: '#d00',
            borderRadius: '5px',
            fontSize: '14px'
          }}>
            Ошибка: {error}
          </div>
        )}
      </div>
    );
  }

  // Если инициализация завершена, но пользователь не аутентифицирован
  if (!isAuthenticated) {
    console.log('🔐 User not authenticated, showing auth screen', { 
      environment: Environment.getEnvironment(),
      authMethod 
    });
    
    // В зависимости от окружения показываем соответствующий экран аутентификации
    if (Environment.isTelegram()) {
      // В TMA аутентификация должна быть автоматической, поэтому это ошибка
      return (
        <div className="app-error" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#d00', marginBottom: '20px' }}>
            Ошибка аутентификации в Telegram
          </h1>
          <p style={{ marginBottom: '20px', fontSize: '16px' }}>
            Не удалось войти через Telegram Mini App. Пожалуйста, попробуйте перезагрузить приложение.
          </p>
          {error && (
            <div style={{ 
              padding: '10px', 
              background: '#ffe6e6', 
              color: '#d00',
              borderRadius: '5px',
              fontSize: '14px',
              maxWidth: '500px'
            }}>
              Детали: {error}
            </div>
          )}
        </div>
      );
    } else {
      // В браузере показываем экран аутентификации через Telegram Widget
      return <BrowserAuthScreen />;
    }
  }

  // Если пользователь аутентифицирован, показываем основное приложение
  console.log('🎯 Rendering main app', { 
    authMethod, 
    isAuthenticated, 
    isInitialized 
  });

  return (
    <ErrorBoundary>
      <div className="app">
        <DebugPanel />
        <Layout>
          <DevelopmentBanner />
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Routes>
          </Router>
          <DebugInfo />
        </Layout>
      </div>
    </ErrorBoundary>
  );
}

export default App;