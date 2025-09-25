import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { expandViewport, isTMA } from '@telegram-apps/sdk';
import { safeWebApp } from '@/utils/initTelegramSDK';
import OnboardingPage from '@/pages/OnboardingPage';
import HomePage from '@/pages/HomePage';
import DevelopmentBanner from '@/components/DevelopmentBanner';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import { initTelegramSDK } from '@/utils/telegramSDK';
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isTelegramEnv, initData, userData } = useTelegram();
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('🔍 App mounted. isTelegramEnv:', isTelegramEnv);
    console.log('📱 InitData available:', !!initData);
    console.log('👤 User data:', userData);

    const initializeApp = async () => {
      try {
        // 1. Инициализируем Telegram SDK
        const sdkInitialized = initTelegramSDK();
        console.log('✅ Telegram SDK initialized:', sdkInitialized);
        
        // 2. Расширяем viewport если в Telegram
        if (isTelegramEnv) {
          try {
            const tma = await isTMA();
            console.log('📱 TMA check result:', tma);
            if (tma) {
              await expandViewport();
              console.log('✅ Viewport expanded successfully');
            }
          } catch (e) {
            console.warn('❌ expandViewport failed:', e);
          }
        }

        // 3. Инициализируем аутентификацию
        if (isTelegramEnv && initData) {
          console.log('🔐 Using Telegram authentication');
          await initializeAuth(initData);
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
  }, [isTelegramEnv, initData, initializeAuth]);

  if (!isInitialized || isLoading) {
    console.log('⏳ Showing loading state');
    return <div>Loading...</div>;
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
      </Layout>
    </ErrorBoundary>
  );
}

export default App;