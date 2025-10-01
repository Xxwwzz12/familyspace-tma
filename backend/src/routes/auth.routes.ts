import { Router } from 'express';
import { authInit, testAuth, testHashValidation } from '../controllers/auth.controller';

const router = Router();

// 🔍 Явный обработчик для preflight-запроса к /auth/test
router.options('/test', (req, res) => {
  console.log('🟢 OPTIONS /auth/test handler was called successfully');
  
  // Добавляем CORS-заголовки вручную для диагностики
  res.header('Access-Control-Allow-Origin', 'https://familyspace-tma.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  console.log('📤 Manually set CORS headers for OPTIONS request');
  res.status(200).send();
});

// Существующие роуты
router.post('/init', authInit);
router.post('/test', testAuth);
router.post('/test-hash', testHashValidation);

export default router;