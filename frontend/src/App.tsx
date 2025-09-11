import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { safeWebApp } from '@/utils/initTelegramSDK';
import Layout from '@/components/Layout';
import OnboardingPage from '@/pages/OnboardingPage';
import HomePage from '@/pages/HomePage';
import DevelopmentBanner from '@/components/DevelopmentBanner';
import './App.css';

function App() {
  const isAuthenticated = false; // Заглушка. Реальную проверку добавим позже

  useEffect(() => {
    safeWebApp.ready();
  }, []);

  return (
    <>
      <DevelopmentBanner />
      <Router>
        <Routes>
          {!isAuthenticated ? (
            <Route path="*" element={<OnboardingPage />} />
          ) : (
            <Route path="*" element={<Layout><HomePage /></Layout>} />
          )}
        </Routes>
      </Router>
    </>
  );
}

export default App;