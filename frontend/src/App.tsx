import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import useTelegram from './hooks/useTelegram';
import { useAuthStore } from './stores/auth.store';
import DevelopmentBanner from './components/DevelopmentBanner';
import DebugPanel from './components/DebugPanel';
import DebugInfo from './components/DebugInfo';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isTelegramEnv, isSDKReady, initData } = useTelegram();
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();
  
  // 🔒 Защита от повторной инициализации
  const initializedRef = useRef(false);

  // 🔧 Инициализация Eruda только в debug режиме
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('debug') === 'true';
    
    if (isDebugMode) {
      console.log('🔧 Debug mode activated, initializing Eruda...');
      
      import('eruda')
        .then((erudaModule) => {
          const eruda = erudaModule.default;
          eruda.init();
          console.log('✅ Eruda debug console initialized successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to initialize Eruda:', error);
        });
    }
  }, []);

  // 🔧 ЕДИНСТВЕННЫЙ эффект для инициализации приложения
  useEffect(() => {
    const initializeApp = async () => {
      // 🔒 Защита от повторной инициализации
      if (initializedRef.current) {
        console.log('🔄 App already initialized, skipping...');
        return;
      }

      console.log('🚀 Starting app initialization...');
      
      try {
        // Диагностика Telegram WebApp
        const webApp = window.Telegram?.WebApp;
        console.log('📱 Telegram WebApp check:', {
          hasTelegram: typeof window.Telegram !== 'undefined',
          hasWebApp: typeof webApp !== 'undefined',
          hasInitData: !!webApp?.initData,
          isTelegramEnv: isTelegramEnv,
          isSDKReady: isSDKReady
        });

        // Инициализация Telegram WebApp
        if (webApp) {
          try {
            webApp.ready();
            console.log('✅ Telegram WebApp marked as ready');
          } catch (readyError) {
            console.warn('⚠️ Telegram WebApp.ready() failed:', readyError);
          }
        }

        // Аутентификация
        if (isTelegramEnv && initData) {
          console.log('🔐 Attempting Telegram authentication...');
          console.log('📋 InitData content:', {
            length: initData?.length || 0,
            first100Chars: initData?.substring(0, 100) + '...'
          });
          
          await initializeAuth(initData);
          console.log('✅ Authentication completed');
        } else {
          console.log('ℹ️ No Telegram WebApp environment, using standalone mode');
          await initializeAuth(null);
          console.log('✅ Standalone mode initialized');
        }

        // ✅ КРИТИЧЕСКИ ВАЖНО: правильная последовательность установки флагов
        initializedRef.current = true;
        setIsInitialized(true);
        
        console.log('🎉 App initialization completed successfully');
        console.log('🔐 Final auth status:', { isAuthenticated, isLoading });

      } catch (error) {
        console.error('❌ App initialization error:', error);
        console.error('💥 Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // 🔒 Даже при ошибке снимаем блокировку инициализации
        initializedRef.current = true;
        setIsInitialized(true);
      }
    };

    // Запускаем инициализацию только когда SDK готов
    if (isSDKReady) {
      initializeApp();
    } else {
      console.log('⏳ Waiting for Telegram SDK to be ready...');
    }
  }, [isSDKReady, isTelegramEnv, initData, initializeAuth]); // Правильные зависимости

  // Убраны дублирующие useEffect для диагностики Telegram WebApp

  // 🔧 Упрощенное условие показа loading
  if (!isInitialized || isLoading) {
    console.log('⏳ Showing loading state', { isInitialized, isLoading });
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  console.log('🎯 Rendering main content', { 
    isAuthenticated, 
    isInitialized, 
    isLoading 
  });

  return (
    <ErrorBoundary>
      <Layout>
        <DevelopmentBanner />
        <Router>
          <Routes>
            <Route path="/" element={
              isAuthenticated ? <HomePage /> : <OnboardingPage />
            } />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Routes>
        </Router>
        
        {/* 🔍 КОМПОНЕНТ ДИАГНОСТИКИ */}
        <DebugInfo />
        
        {/* Условный рендеринг DebugPanel только в development режиме */}
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;