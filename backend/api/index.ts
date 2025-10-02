// backend/api/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://familyspace-tma.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Простой ответ для корневого пути
  res.status(200).json({
    message: 'FamilySpace TMA Backend API',
    version: '1.0',
    endpoints: [
      '/api/auth/init',
      '/api/test/ping'
    ]
  });
}