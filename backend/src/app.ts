import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { mainRouter } from './routes';
import authRoutes from './routes/auth.routes';

// Проверка окружения при старте
const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log('Available environment variables:', Object.keys(process.env));
  process.exit(1);
}

console.log('✅ All required environment variables are set');

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'https://familyspace-tma.vercel.app'],
  credentials: true,
}));
app.use(express.json());

// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use('/auth', authRoutes);
app.use('/api', mainRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;