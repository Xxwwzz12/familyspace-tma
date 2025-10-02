// api/test/ping.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(request: VercelRequest, response: VercelResponse) {
  response.status(200).json({
    ok: true,
    message: 'Ping successful',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}