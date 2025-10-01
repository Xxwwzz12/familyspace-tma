// backend/src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Проверка критически важных переменных окружения при старте
const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют необходимые переменные окружения:', missingVars);
  process.exit(1);
}
console.log('✅ Все необходимые переменные окружения установлены');

const app = express();

// --- CORS whitelist ---
const allowedOrigins = [
  'http://localhost:5173',
  'https://familyspace-tma.vercel.app',
  // можно добавить другие доверенные домены
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
};

// ------------------------
// 1) Явная CORS middleware ПЕРЕД helmet
// ------------------------
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  if (origin && allowedOrigins.includes(origin)) {
    // Эхо-origin — безопаснее чем '*', когда нужны credentials
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Для отладки можно временно раскомментировать:
  // else res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    // Быстрый ответ на preflight, не пропускаем дальше
    return res.sendStatus(200);
  }
  next();
});

// ------------------------
// 2) CORS middleware (как backup)
// ------------------------
app.use(cors(corsOptions));

// ------------------------
// 3) security middleware
// ------------------------
app.use(helmet());

// ------------------------
// 4) Парсер JSON
// ------------------------
app.use(express.json());

// ------------------------
// 5) Логирование входящих запросов
// ------------------------
app.use((req, res, next) => {
  console.log('🔔 Incoming Request:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
  });

  // После завершения запроса логируем какие заголовки реально ушли клиенту
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

// ------------------------
// 6) Роуты (порядок важен)
// ------------------------
import authRoutes from './routes/auth.routes';
import { mainRouter } from './routes';

app.use('/auth', authRoutes);
app.use('/api', mainRouter);

// ------------------------
// 7) Health-check
// ------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;
