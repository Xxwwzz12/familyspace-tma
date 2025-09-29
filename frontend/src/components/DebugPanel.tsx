import { useState, useEffect } from 'react';

interface DataComparison {
  original: string;
  backend: string;
  differences: Array<{
    key: string;
    originalValue: string;
    backendValue: string;
    hasDifference: boolean;
  }>;
}

interface HashInfo {
  algorithm: string;
  input: string;
  result: string;
  steps: string[];
}

interface EnvironmentInfo {
  platform: string;
  version: string;
  colorScheme: string;
  viewportHeight: number;
  viewportStableHeight: number;
  initDataUnsafe: any;
}

const DebugPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [originalInitData, setOriginalInitData] = useState<string>('');
  const [backendData, setBackendData] = useState<string>('');
  const [comparison, setComparison] = useState<DataComparison | null>(null);
  const [hashInfo, setHashInfo] = useState<HashInfo | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);

  // Получение данных из Telegram WebApp
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      setOriginalInitData(webApp.initData || '');
      
      setEnvironment({
        platform: webApp.platform || 'unknown',
        version: webApp.version || 'unknown',
        colorScheme: webApp.colorScheme || 'unknown',
        viewportHeight: webApp.viewportHeight || 0,
        viewportStableHeight: webApp.viewportStableHeight || 0,
        initDataUnsafe: webApp.initDataUnsafe || {}
      });

      // Симуляция данных для бэкенда (в реальном приложении это будет из API или контекста)
      const simulatedBackendData = JSON.stringify({
        ...webApp.initDataUnsafe,
        hash: 'simulated_hash_' + Date.now(),
        timestamp: new Date().toISOString()
      }, null, 2);
      
      setBackendData(simulatedBackendData);
    }
  }, []);

  // Сравнение данных при изменении
  useEffect(() => {
    if (originalInitData && backendData) {
      compareData();
      analyzeHash();
    }
  }, [originalInitData, backendData]);

  const compareData = () => {
    try {
      const originalObj = parseInitData(originalInitData);
      const backendObj = JSON.parse(backendData);
      
      const allKeys = new Set([
        ...Object.keys(originalObj),
        ...Object.keys(backendObj)
      ]);

      const differences = Array.from(allKeys).map(key => ({
        key,
        originalValue: String(originalObj[key] || 'N/A'),
        backendValue: String(backendObj[key] || 'N/A'),
        hasDifference: String(originalObj[key]) !== String(backendObj[key])
      }));

      setComparison({
        original: originalInitData,
        backend: backendData,
        differences
      });
    } catch (error) {
      console.error('Error comparing data:', error);
    }
  };

  const parseInitData = (initData: string): Record<string, any> => {
    const result: Record<string, any> = {};
    try {
      const params = new URLSearchParams(initData);
      params.forEach((value, key) => {
        result[key] = value;
      });
    } catch (error) {
      console.error('Error parsing initData:', error);
    }
    return result;
  };

  const analyzeHash = () => {
    // Симуляция анализа хэша
    setHashInfo({
      algorithm: 'SHA-256',
      input: originalInitData,
      result: 'simulated_hash_result',
      steps: [
        'Получение initData от Telegram',
        'Парсинг параметров',
        'Сортировка параметров',
        'Конкатенация в строку',
        'Вычисление хэша',
        'Кодирование в base64'
      ]
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${type} скопировано в буфер обмена`);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    return (
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999
      }}>
        <button
          onClick={togglePanel}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          🐛 Debug
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.95)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      fontFamily: 'monospace',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      border: '1px solid #333'
    }}>
      {/* Заголовок и кнопка закрытия */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid #444',
        paddingBottom: '10px'
      }}>
        <h3 style={{ margin: 0, color: '#4CAF50' }}>🔧 Панель отладки</h3>
        <button
          onClick={togglePanel}
          style={{
            background: '#ff4444',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕ Закрыть
        </button>
      </div>

      {/* Информация о среде */}
      {environment && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#4CAF50', marginBottom: '8px' }}>🌍 Информация о среде</h4>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '10px'
          }}>
            <div><strong>Платформа:</strong> {environment.platform}</div>
            <div><strong>Версия WebApp:</strong> {environment.version}</div>
            <div><strong>Цветовая схема:</strong> {environment.colorScheme}</div>
            <div><strong>Высота viewport:</strong> {environment.viewportHeight}px</div>
            <div><strong>Стабильная высота:</strong> {environment.viewportStableHeight}px</div>
          </div>
        </div>
      )}

      {/* Сравнение данных */}
      {comparison && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#4CAF50', marginBottom: '8px' }}>📊 Сравнение данных</h4>
          
          {/* Оригинальные данные */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '5px'
            }}>
              <strong>Оригинальный initData:</strong>
              <button
                onClick={() => copyToClipboard(comparison.original, 'Оригинальные данные')}
                style={{
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                📋 Копировать
              </button>
            </div>
            <pre style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '150px',
              fontSize: '10px',
              margin: 0
            }}>
              {comparison.original}
            </pre>
          </div>

          {/* Данные для бэкенда */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '5px'
            }}>
              <strong>Данные для бэкенда:</strong>
              <button
                onClick={() => copyToClipboard(comparison.backend, 'Данные для бэкенда')}
                style={{
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                📋 Копировать
              </button>
            </div>
            <pre style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '150px',
              fontSize: '10px',
              margin: 0
            }}>
              {comparison.backend}
            </pre>
          </div>

          {/* Различия */}
          <div>
            <strong>Различия:</strong>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '10px',
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {comparison.differences.map((diff, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '3px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: diff.hasDifference ? 'rgba(255,0,0,0.1)' : 'transparent'
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 'bold' }}>{diff.key}:</span>
                  <span style={{ flex: 2, color: diff.hasDifference ? '#ff6b6b' : '#aaa' }}>
                    {diff.originalValue}
                  </span>
                  <span style={{ flex: 2, color: diff.hasDifference ? '#ff6b6b' : '#aaa' }}>
                    {diff.backendValue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Визуализатор хэша */}
      {hashInfo && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#4CAF50', marginBottom: '8px' }}>🔐 Визуализация хэша</h4>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '10px',
            borderRadius: '4px'
          }}>
            <div><strong>Алгоритм:</strong> {hashInfo.algorithm}</div>
            <div style={{ margin: '8px 0' }}>
              <strong>Входные данные:</strong>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '5px',
                borderRadius: '3px',
                fontSize: '10px',
                marginTop: '3px',
                wordBreak: 'break-all'
              }}>
                {hashInfo.input}
              </div>
            </div>
            <div style={{ margin: '8px 0' }}>
              <strong>Результат:</strong>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '5px',
                borderRadius: '3px',
                fontSize: '10px',
                marginTop: '3px',
                wordBreak: 'break-all',
                color: '#4CAF50'
              }}>
                {hashInfo.result}
              </div>
            </div>
            <div>
              <strong>Этапы вычисления:</strong>
              <div style={{ marginTop: '5px' }}>
                {hashInfo.steps.map((step, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px 0',
                      fontSize: '11px'
                    }}
                  >
                    <span style={{ color: '#4CAF50', marginRight: '5px' }}>→</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#FF9800',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔄 Обновить страницу
        </button>
        <button
          onClick={() => copyToClipboard(JSON.stringify({
            originalInitData,
            backendData,
            environment,
            comparison,
            hashInfo
          }, null, 2), 'Все данные отладки')}
          style={{
            background: '#9C27B0',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          💾 Экспорт всех данных
        </button>
      </div>
    </div>
  );
};

export default DebugPanel;