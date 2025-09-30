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
  
  // 🔧 ДОБАВЛЕН: useRef для предотвращения двойной инициализации
  const initializedRef = useRef(false);

  // 🔧 ДОБАВЛЕН: useEffect для инициализации Eruda
  useEffect(() => {
    // Проверяем параметр debug в URL
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('debug') === 'true';
    
    if (isDebugMode) {
      console.log('🔧 Debug mode activated, initializing Eruda...');
      
      // Динамический импорт Eruda
      import('eruda')
        .then((erudaModule) => {
          const eruda = erudaModule.default;
          eruda.init();
          console.log('✅ Eruda debug console initialized successfully');
          
          // Дополнительная диагностика Telegram WebApp
          console.log('📱 Telegram WebApp check:', {
            hasTelegram: typeof window.Telegram !== 'undefined',
            hasWebApp: typeof window.Telegram?.WebApp !== 'undefined',
            initData: window.Telegram?.WebApp?.initData,
            initDataUnsafe: window.Telegram?.WebApp?.initDataUnsafe,
            platform: window.Telegram?.WebApp?.platform,
            version: window.Telegram?.WebApp?.version
          });
        })
        .catch((error) => {
          console.error('❌ Failed to initialize Eruda:', error);
        });
    }
  }, []);

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

  // 🔄 ОБНОВЛЕН: useEffect для инициализации приложения с защитой от двойного вызова
  useEffect(() => {
    // Предотвращаем двойную инициализацию
    if (initializedRef.current) {
      console.log('🔄 App already initialized, skipping...');
      return;
    }
    
    initializedRef.current = true;
    console.log('🏗️ App initialization started (FIRST TIME)');

    const initializeApp = async () => {
      // Ждем загрузки SDK Telegram
      if (!isSDKReady) {
        console.log('⏳ Waiting for Telegram SDK...');
        return;
      }

      try {
        console.log('📱 Telegram env check:', {
          hasTelegram: typeof window.Telegram !== 'undefined',
          hasWebApp: typeof window.Telegram?.WebApp !== 'undefined',
          hasInitData: !!window.Telegram?.WebApp?.initData,
          isTelegramEnv: isTelegramEnv,
          isSDKReady: isSDKReady
        });
        
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

        if (isTelegramEnv && initData) {
          console.log('🔐 Starting Telegram authentication');
          console.log('📋 InitData content:', {
            length: initData?.length || 0,
            first100Chars: initData?.substring(0, 100) + '...'
          });
          
          await initializeAuth(initData);
          console.log('✅ Telegram authentication completed');
        } else {
          console.log('🧪 Falling back to test authentication');
          await initializeAuth(null);
          console.log('✅ Test authentication completed');
        }
        
        setIsInitialized(true);
        console.log('🎉 App initialization completed successfully');
        console.log('🔐 Final auth status:', { isAuthenticated, isLoading });
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        console.error('💥 Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [isSDKReady, isTelegramEnv, initData, initializeAuth, isAuthenticated, isLoading]);

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
        
        {/* 🔍 ДОБАВЛЕН КОМПОНЕНТ ДИАГНОСТИКИ */}
        <DebugInfo />
        
        {/* Условный рендеринг DebugPanel только в development режиме */}
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;