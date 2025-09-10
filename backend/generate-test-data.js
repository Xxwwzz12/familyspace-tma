const crypto = require('crypto');

// Данные вашего бота
const BOT_TOKEN = process.env.BOT_TOKEN;
const TEST_USER = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser'
};

// Генерация подписанных данных
function generateTestInitData() {
  const auth_date = Math.floor(Date.now() / 1000);
  const user = JSON.stringify(TEST_USER);
  
  const dataToSign = `auth_date=${auth_date}\nuser=${user}`;
  
  // Генерация секретного ключа
  const secretKey = crypto.createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  
  // Вычисление хеша
  const hash = crypto.createHmac('sha256', secretKey)
    .update(dataToSign)
    .digest('hex');
  
  return `auth_date=${auth_date}&user=${encodeURIComponent(user)}&hash=${hash}`;
}

console.log('Generated initData:');
console.log(generateTestInitData());