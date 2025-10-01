import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { mainRouter } from './routes';
import authRoutes from './routes/auth.routes';

// Проверка критически важных переменных окружения при старте
const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют необходимые переменные окружения:', missingVars);
  process.exit(1);
}
console.log('✅ Все необходимые переменные окружения установлены');

const app = express();

// 1. Безопасность: Подключаем Helmet первым
app.use(helmet());

// 2. Настройка CORS
// Белый список разрешенных доменов :cite[3]:cite[7]
const allowedOrigins = [
  'http://localhost:5173', // Фронтенд для разработки
  'https://familyspace-tma.vercel.app', // Ваш продакшн-фронтенд
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Разрешаем запросы с отсутствующим origin (например, мобильные приложения, Postman) :cite[3]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🛑 CORS заблокировал запрос с origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Разрешить отправку кук и заголовков авторизации :cite[1]
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Явно указанные разрешенные методы :cite[1]
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Разрешенные заголовки :cite[1]
};

app.use(cors(corsOptions)); // Подключаем CORS middleware ДО всех маршрутов :cite[5]

// 3. Парсер для JSON
app.use(express.json());

// 4. Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log('🔔 Incoming Request:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']
  });
  next();
});

// 5. Подключение маршрутов
app.use('/auth', authRoutes);
app.use('/api', mainRouter);

// 6. Health-check маршрут
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;