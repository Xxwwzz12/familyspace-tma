import React from 'react';

const DebugInfo: React.FC = () => {
  const debugAuth = (window as any).debugAuth;
  const debugTelegram = (window as any).debugTelegram;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена!');
  };

  if (!debugAuth && !debugTelegram) {
    return (
      <div style={{ padding: '10px', background: '#ffcccc', border: '1px solid red' }}>
        🔍 Debug информация: Данные не найдены. Проверьте, что аутентификация была вызвана.
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      background: '#f0f0f0', 
      border: '2px solid #ccc',
      padding: '10px',
      fontSize: '12px',
      zIndex: 10000,
      maxHeight: '50vh',
      overflow: 'auto'
    }}>
      <h3>🔍 ДИАГНОСТИЧЕСКАЯ ИНФОРМАЦИЯ</h3>
      
      {debugAuth && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#e0ffe0', border: '1px solid green' }}>
          <h4>Аутентификация:</h4>
          <div><strong>Статус:</strong> {debugAuth.status}</div>
          <div><strong>Пользователь:</strong> {debugAuth.user?.first_name} {debugAuth.user?.last_name}</div>
          <div><strong>ID:</strong> {debugAuth.user?.id}</div>
          
          {debugAuth.hashCheck && (
            <div style={{ marginTop: '10px', padding: '8px', background: '#fff0f0', border: '1px solid #ff9999' }}>
              <h5>Проверка хэша:</h5>
              <div><strong>Ожидаемый хэш:</strong> {debugAuth.hashCheck.expectedHash}</div>
              <div><strong>Фактический хэш:</strong> {debugAuth.hashCheck.actualHash}</div>
              <div>
                <strong>Статус: </strong>
                <span style={{ 
                  color: debugAuth.hashCheck.isValid ? 'green' : 'red',
                  fontWeight: 'bold'
                }}>
                  {debugAuth.hashCheck.isValid ? '✓ ВАЛИДЕН' : '✗ НЕВАЛИДЕН'}
                </span>
              </div>
              {!debugAuth.hashCheck.isValid && (
                <div style={{ marginTop: '5px', fontSize: '11px', color: '#cc0000' }}>
                  ⚠️ Хэши не совпадают! Возможна проблема с подписью данных
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={() => copyToClipboard(debugAuth.initData)}
            style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}
          >
            📋 Копировать initData
          </button>
        </div>
      )}
      
      {debugTelegram && (
        <div style={{ padding: '10px', background: '#e0f0ff', border: '1px solid blue' }}>
          <h4>Telegram данные:</h4>
          <div><strong>Версия WebApp:</strong> {debugTelegram.version}</div>
          <div><strong>Платформа:</strong> {debugTelegram.platform}</div>
          <div><strong>Длина initData:</strong> {debugTelegram.initData?.length} символов</div>
          
          <h5>Параметры initData:</h5>
          <div style={{ fontSize: '10px', background: 'white', padding: '5px', overflow: 'auto' }}>
            {debugTelegram.rawParams && Object.entries(debugTelegram.rawParams).map(([key, value]) => (
              <div key={key}><strong>{key}:</strong> {String(value).substring(0, 100)}...</div>
            ))}
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={() => copyToClipboard(debugTelegram.initData)}
              style={{ padding: '5px 10px', cursor: 'pointer' }}
            >
              📋 Копировать initData Telegram
            </button>
            <button 
              onClick={() => copyToClipboard(JSON.stringify(debugTelegram.initDataUnsafe))}
              style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer' }}
            >
              📋 Копировать initDataUnsafe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugInfo;