// backend/api/ping.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('x-test-ping', '1');
  res.json({ ok: true, time: new Date().toISOString() });
}
