import { useState, useEffect } from 'react';

interface WebAppDiagnostics {
  platform: string;
  version: string;
  colorScheme: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  initData: string;
  initDataUnsafe: any;
  [key: string]: any;
}

const DebugPanel = () => {
  const [isDebugActive, setIsDebugActive] = useState(false);
  const [initData, setInitData] = useState<string>('');
  const [webAppStatus, setWebAppStatus] = useState<WebAppDiagnostics | null>(null);
  const [erudaError, setErudaError] = useState<string>('');
  const [erudaActive, setErudaActive] = useState(false);

  // Безопасная работа с Eruda
  const toggleEruda = async (activate: boolean) => {
    try {
      if (activate) {
        // Проверяем, не загружена ли Eruda уже
        if (window.eruda) {
          setErudaActive(true);
          return;
        }

        // Динамический импорт с обработкой ошибок и явным указанием типа
        const erudaModule = await import('eruda' as any);
        
        // Проверяем наличие модуля и его default экспорта
        if (erudaModule?.default) {
          window.eruda = erudaModule.default;
          // Безопасный вызов init
          window.eruda?.init();
          setErudaActive(true);
          setErudaError('');
          console.log('Eruda activated successfully');
        } else {
          throw new Error('Eruda module loaded but default export is missing');
        }
      } else {
        // Безопасное удаление Eruda с проверками
        if (window.eruda) {
          // Используем опциональную цепочку
          window.eruda?.destroy();
          
          // Очищаем DOM-элементы Eruda
          const erudaContainer = document.querySelector('.eruda-container');
          if (erudaContainer) {
            erudaContainer.remove();
          }
          
          // Безопасное удаление свойства
          if (window.hasOwnProperty('eruda')) {
            delete (window as any).eruda;
          }
          
          setErudaActive(false);
          console.log('Eruda deactivated successfully');
        }
      }
    } catch (error) {
      console.warn('Eruda failed to load:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErudaError(`Failed to ${activate ? 'activate' : 'deactivate'} Eruda: ${errorMessage}`);
      setErudaActive(false);
      
      // Fallback: попытка создать консольное сообщение
      if (activate) {
        console.warn('Debug mode activated without Eruda UI');
      }
    }
  };

  // Синхронизация состояния Eruda с переключателем
  useEffect(() => {
    toggleEruda(isDebugActive);
  }, [isDebugActive]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      // Безопасный вызов destroy с проверкой
      if (window.eruda) {
        window.eruda?.destroy();
        if (window.hasOwnProperty('eruda')) {
          delete (window as any).eruda;
        }
      }
    };
  }, []);

  // Безопасный индексный доступ к свойствам WebApp
  const getWebAppProperty = (webApp: any, key: string): any => {
    if (webApp && typeof webApp === 'object' && key in webApp) {
      return webApp[key];
    }
    return undefined;
  };

  // Сбор данных Telegram WebApp
  useEffect(() => {
    if (isDebugActive) {
      // Безопасный доступ к Telegram WebApp
      const webApp = window.Telegram?.WebApp;
      
      if (webApp) {
        const diagnostics: WebAppDiagnostics = {
          platform: getWebAppProperty(webApp, 'platform') || 'not available',
          version: getWebAppProperty(webApp, 'version') || 'not available',
          colorScheme: getWebAppProperty(webApp, 'colorScheme') || 'not available',
          isExpanded: getWebAppProperty(webApp, 'isExpanded') ?? false,
          viewportHeight: getWebAppProperty(webApp, 'viewportHeight') || 0,
          viewportStableHeight: getWebAppProperty(webApp, 'viewportStableHeight') || 0,
          initData: getWebAppProperty(webApp, 'initData') || 'not available',
          initDataUnsafe: getWebAppProperty(webApp, 'initDataUnsafe') || 'not available',
        };

        // Безопасно добавляем дополнительные свойства
        if (webApp && typeof webApp === 'object') {
          Object.keys(webApp).forEach(key => {
            if (!(key in diagnostics) && typeof getWebAppProperty(webApp, key) !== 'function') {
              diagnostics[key] = getWebAppProperty(webApp, key);
            }
          });
        }

        setWebAppStatus(diagnostics);
        setInitData(getWebAppProperty(webApp, 'initData') || 'No initData');
      } else {
        setWebAppStatus(null);
        setInitData('Telegram WebApp not available');
      }
    } else {
      // Очищаем данные при деактивации
      setWebAppStatus(null);
      setInitData('');
      setErudaError('');
    }
  }, [isDebugActive]);

  const toggleDebug = () => {
    setIsDebugActive(!isDebugActive);
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      zIndex: 9999,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '350px',
      fontFamily: 'monospace',
      boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <button 
        onClick={toggleDebug}
        style={{
          background: isDebugActive ? '#ff4444' : '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: isDebugActive ? '10px' : '0',
          fontWeight: 'bold',
          width: '100%'
        }}
      >
        {isDebugActive ? '❌ Close Debug' : '🐛 Debug'}
        {erudaActive && isDebugActive && ' (Eruda Active)'}
      </button>

      {isDebugActive && (
        <div>
          {erudaError && (
            <div style={{ 
              color: '#ff6b6b', 
              marginBottom: '10px',
              padding: '5px',
              background: 'rgba(255,0,0,0.1)',
              borderRadius: '3px'
            }}>
              <strong>Eruda Error:</strong> {erudaError}
            </div>
          )}
          
          {!erudaActive && !erudaError && (
            <div style={{ 
              color: '#ffa500', 
              marginBottom: '10px',
              padding: '5px',
              background: 'rgba(255,165,0,0.1)',
              borderRadius: '3px'
            }}>
              Debug mode active (Eruda loading...)
            </div>
          )}
          
          <div style={{ marginBottom: '10px', borderBottom: '1px solid #555', paddingBottom: '5px' }}>
            <strong>Telegram WebApp Status:</strong>
          </div>
          
          {webAppStatus ? (
            <div style={{ marginBottom: '10px' }}>
              {Object.entries(webAppStatus).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '3px' }}>
                  <span style={{ color: '#aaa' }}>{key}:</span>{' '}
                  <span style={{ color: '#fff', wordBreak: 'break-all' }}>
                    {formatValue(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#ff6b6b', marginBottom: '10px' }}>
              Telegram WebApp not available
            </div>
          )}
          
          <div style={{ marginBottom: '5px', borderBottom: '1px solid #555', paddingBottom: '5px' }}>
            <strong>Raw Init Data:</strong>
          </div>
          <pre style={{ 
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            maxHeight: '150px',
            overflow: 'auto',
            background: 'rgba(255,255,255,0.1)',
            padding: '8px',
            borderRadius: '3px',
            fontSize: '10px',
            margin: 0
          }}>
            {initData}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;