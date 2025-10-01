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
  console.log('Доступные переменные окружения:', Object.keys(process.env));
  process.exit(1);
}
console.log('✅ Все необходимые переменные окружения установлены');

const app = express();

// --- CORS whitelist ---
const allowedOrigins = [
  'http://localhost:5173', // Фронтенд для разработки
  'https://familyspace-tma.vercel.app', // Ваш продакшн-фронтенд
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Разрешаем запросы с отсутствующим origin (например, Postman) и доверенным origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🛑 CORS заблокировал запрос с origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// 0) Подключаем CORS ПЕРЕД helmet, чтобы заголовки были установлены как можно раньше
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // явная обработка preflight для всех путей

// 0.5) Резервная "echo" middleware — гарантируем установку CORS-заголовков для всех ответов.
// Это полезно на платформах/проксях, где какие-то заголовки могут быть перезаписаны.
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 1) Безопасность: Helmet (после CORS)
app.use(helmet());

// 2) Парсер для JSON
app.use(express.json());

// 3) Логирование всех входящих запросов и лог заголовков ответа
app.use((req, res, next) => {
  console.log('🔔 Incoming Request:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']
  });

  res.on('finish', () => {
    try {
      const outHeaders = res.getHeaders();
      console.log('📤 Response headers sent for', req.method, req.url, outHeaders);
    } catch (err) {
      console.warn('Не удалось прочитать заголовки ответа', err);
    }
  });

  next();
});

// 4) Подключение маршрутов
app.use('/auth', authRoutes);        // оригинальный путь
app.use('/api/auth', authRoutes);    // дублирующий путь для Vercel rewrites (/api/* -> функция)
app.use('/api', mainRouter);

// 5) Health-check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;
