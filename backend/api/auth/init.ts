// backend/api/auth/init.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log('🔔 Auth init called:', {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body
  });
  
  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', 'https://familyspace-tma.vercel.app');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS request');
    return response.status(200).end();
  }

  // === РАБОТА С ТЕЛОМ ЗАПРОСА ===
  let parsedBody = request.body;
  
  // Если тело запроса - строка, попробуем распарсить её как JSON
  if (typeof parsedBody === 'string') {
    if (parsedBody.trim() === '') {
      console.log('⚠️ Empty request body');
      return response.status(400).json({ error: 'Request body is empty' });
    }
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return response.status(400).json({ error: 'Invalid JSON in request body' });
    }
  }
  // ===============================

  if (request.method !== 'POST') {
    console.log('❌ Method not allowed:', request.method);
    return response.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Используем распаршенное тело
    const { initData } = parsedBody;
    
    console.log('📦 Parsed request body:', parsedBody);
    
    if (!initData) {
      console.log('⚠️ initData is missing');
      return response.status(400).json({ error: 'initData is required' });
    }
    
    console.log('✅ Auth successful, returning response');
    
    response.status(200).json({
      success: true,
      message: 'Auth init processed',
      user: { id: 123, name: 'Test User' },
      token: 'test-jwt-token'
    });
    
  } catch (error) {
    console.error('💥 Auth init error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}