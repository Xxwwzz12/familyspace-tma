import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { expandViewport, isTMA } from '@telegram-apps/sdk';
import { safeWebApp } from '@/utils/initTelegramSDK';
import OnboardingPage from '@/pages/OnboardingPage';
import HomePage from '@/pages/HomePage';
import DevelopmentBanner from '@/components/DevelopmentBanner';
import { useAuthStore } from '@/stores/auth.store';
import { isTelegramEnv } from '@/utils/env';
import './App.css';

function AppContent() {
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();
  
  console.log('🏗️ AppContent render. isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  useEffect(() => {
    console.log('🔍 App mounted. isTelegramEnv:', isTelegramEnv());
    safeWebApp.ready();
    console.log('Текущий путь:', window.location.pathname);
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  if (isLoading) {
    console.log('⏳ Showing loading state');
    return <div>Loading...</div>;
  }

  console.log('🎯 Rendering main content. User authenticated:', isAuthenticated);
  
  return (
    <>
      <DevelopmentBanner />
      <Router>
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomePage /> : <OnboardingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
      </Router>
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;