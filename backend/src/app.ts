import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { mainRouter } from './routes';
import authRoutes from './routes/auth.routes';

// Проверка критически важных переменных окружения при старте:cite[4]
const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют необходимые переменные окружения:', missingVars);
  console.log('Доступные переменные окружения:', Object.keys(process.env));
  process.exit(1);
}
console.log('✅ Все необходимые переменные окружения установлены');

const app = express();

// 1. Безопасность: Подключаем Helmet первым:cite[10]
app.use(helmet());

// 2. Настройка CORS:cite[6]:cite[8]
const allowedOrigins = [
  'http://localhost:5173', // Фронтенд для разработки
  'https://familyspace-tma.vercel.app', // Ваш продакшн-фронтенд
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Разрешаем запросы с отсутствующим origin (например, мобильные приложения, Postman):cite[6]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🛑 CORS заблокировал запрос с origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Разрешить отправку кук и заголовков авторизации:cite[3]
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Для совместимости со старыми браузерами:cite[6]
};

app.use(cors(corsOptions)); // Подключаем CORS middleware ДО всех маршрутов:cite[1]

// 3. Парсер для JSON
app.use(express.json());

// 4. Логирование всех входящих запросов:cite[2]
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
app.use('/auth', authRoutes); // Оригинальный путь
app.use('/api/auth', authRoutes); // Дублирующий путь для Vercel rewrites
app.use('/api', mainRouter);

// 6. Health-check маршрут
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;