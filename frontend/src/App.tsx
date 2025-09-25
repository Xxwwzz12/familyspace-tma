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

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isTelegramEnv, initDataRaw } = useTelegram(); // Используем initDataRaw вместо initData
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('🔍 App mounted. isTelegramEnv:', isTelegramEnv);
    console.log('📱 InitDataRaw available:', !!initDataRaw);

    const initializeApp = async () => {
      try {
        if (isTelegramEnv && initDataRaw) {
          console.log('🔐 Using Telegram authentication with initDataRaw');
          await initializeAuth(initDataRaw); // Передаем строку initDataRaw
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
  }, [isTelegramEnv, initDataRaw, initializeAuth]); // Зависимость от initDataRaw

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