import { useEffect, useState } from 'react';
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

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isTelegramEnv, initDataRaw } = useTelegram();
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Безопасный доступ к свойствам Telegram WebApp с опциональной цепочкой
    const webApp = window.Telegram?.WebApp;
    const diagnostics = {
      hasTelegram: typeof window.Telegram !== 'undefined',
      hasWebApp: typeof webApp !== 'undefined',
      initData: webApp?.initData || null,
      initDataUnsafe: webApp?.initDataUnsafe || null,
      platform: webApp?.platform || 'unknown',
      version: webApp?.version || 'unknown',
      themeParams: webApp?.themeParams || {},
      colorScheme: webApp?.colorScheme || 'light',
      isExpanded: webApp?.isExpanded ?? false,
      viewportHeight: webApp?.viewportHeight || 0,
      viewportStableHeight: webApp?.viewportStableHeight || 0,
      headerColor: webApp?.headerColor || 'default',
      backgroundColor: webApp?.backgroundColor || '#ffffff'
    };

    console.log('🔍 Full Telegram WebApp check:', diagnostics);

    // Дополнительная диагностика только если WebApp доступен
    if (webApp) {
      console.log('📱 Telegram WebApp details:', {
        // Безопасный доступ к методам
        canExpand: typeof webApp.expand === 'function',
        canClose: typeof webApp.close === 'function',
        canReady: typeof webApp.ready === 'function',
        // Дополнительные свойства
        initDataLength: webApp.initData?.length || 0,
        user: webApp.initDataUnsafe?.user ? {
          id: webApp.initDataUnsafe.user.id,
          firstName: webApp.initDataUnsafe.user.first_name,
          username: webApp.initDataUnsafe.user.username
        } : null
      });
    }
  }, []);

  useEffect(() => {
    console.log('🔍 App mounted. isTelegramEnv:', isTelegramEnv);
    console.log('📱 InitDataRaw available:', !!initDataRaw);

    const initializeApp = async () => {
      try {
        // Безопасная инициализация Telegram WebApp
        const webApp = window.Telegram?.WebApp;
        if (webApp) {
          try {
            webApp.ready();
            console.log('✅ Telegram WebApp marked as ready');
          } catch (readyError) {
            console.warn('⚠️ Telegram WebApp.ready() failed:', readyError);
          }
        }

        if (isTelegramEnv && initDataRaw) {
          console.log('🔐 Using Telegram authentication with initDataRaw');
          await initializeAuth(initDataRaw);
        } else {
          console.log('🧪 Using test authentication');
          await initializeAuth(null);
        }
        setIsInitialized(true);
        console.log('🎉 App initialization completed');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [isTelegramEnv, initDataRaw, initializeAuth]);

  if (!isInitialized || isLoading) {
    console.log('⏳ Showing loading state');
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

  console.log('🎯 Rendering main content. User authenticated:', isAuthenticated);

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
        {/* Условный рендеринг DebugPanel только в development режиме */}
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;