// backend/api/auth/test.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Устанавливаем CORS-заголовки
  res.setHeader('Access-Control-Allow-Origin', 'https://familyspace-tma.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Простая логика для тестового эндпоинта
    res.status(200).json({
      success: true,
      message: 'Test authentication successful',
      user: { id: 999, name: 'Test User from /test endpoint' },
      token: 'test-jwt-token-from-test-endpoint'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}