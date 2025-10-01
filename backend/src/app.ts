import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { mainRouter } from './routes';
import authRoutes from './routes/auth.routes';

// Проверка окружения при старте
const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют необходимые переменные окружения:', missingVars);
  process.exit(1);
}
console.log('✅ Все необходимые переменные окружения установлены');

const app = express();

// Список разрешенных доменов
const allowedOrigins = [
  'http://localhost:5173', // Фронтенд для разработки
  'https://familyspace-tma.vercel.app', // Ваш продакшн-фронтенд
  'https://telegram-web-app.js' // Для Telegram WebApp
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Разрешить запросы с отсутствующим origin (например, из мобильных приложений или curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🛑 CORS заблокировал запрос с origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Разрешить отправку кук и заголовков авторизации:cite[1]:cite[8]
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Явно укажите разрешенные методы:cite[1]
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Разрешенные заголовки:cite[1]
  optionsSuccessStatus: 200 // Для совместимости со старыми браузерами:cite[1]
};

// Порядок Middleware имеет значение:cite[2]
app.use(helmet());
app.use(cors(corsOptions)); // CORS подключается ДО роутеров:cite[1]:cite[2]
app.use(express.json());

// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Подключение маршрутов
app.use('/auth', authRoutes);
app.use('/api', mainRouter);

// Health-check маршрут
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;