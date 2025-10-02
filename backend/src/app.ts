import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { mainRouter } from './routes';
import authRoutes from './routes/auth.routes';

// --- Критические переменные окружения ---
const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL'];

// Функция проверки переменных окружения при каждом запросе
function checkEnvVars(req: express.Request, res: express.Response, next: express.NextFunction) {
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error('❌ Отсутствуют необходимые переменные окружения:', missingVars);
    // Отправляем 500 с описанием ошибки
    return res.status(500).json({
      error: 'Missing critical environment variables',
      missing: missingVars
    });
  }
  next();
}

const app = express();

// --- CORS whitelist ---
const allowedOrigins = [
  'http://localhost:5173', // фронтенд для разработки
  'https://familyspace-tma.vercel.app', // продакшн фронтенд
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
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

// 0) Подключаем CORS ПЕРЕД helmet
app.use(cors(corsOptions));

// УДАЛЕНО: app.options('*', cors(corsOptions));

// 0.5) Резервная "echo" middleware
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 1) Безопасность: Helmet
app.use(helmet());

// 2) Парсер JSON
app.use(express.json());

// 3) Логирование запросов
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
      console.log('📤 Response headers sent for', req.method, req.url, res.getHeaders());
    } catch (err) {
      console.warn('Не удалось прочитать заголовки ответа', err);
    }
  });

  next();
});

// 4) Проверка переменных окружения для всех маршрутов
app.use(checkEnvVars);

// 5) Подключение маршрутов
app.use('/auth', authRoutes);        // оригинальный путь
app.use('/api/auth', authRoutes);    // для Vercel rewrites
app.use('/api', mainRouter);

// 6) Health-check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;