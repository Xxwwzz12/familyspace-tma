import React from 'react';
import { isDevelopment } from '@/utils/env';
import { isTelegramEnv } from '@/utils/env';

const DevelopmentBanner: React.FC = () => {
  if (!isDevelopment() || isTelegramEnv()) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#ff9900',
      color: '#000',
      padding: '8px',
      textAlign: 'center',
      fontSize: '14px',
      zIndex: 10000
    }}>
      🛠️ Development Mode - Running outside Telegram
    </div>
  );
};

export default DevelopmentBanner;