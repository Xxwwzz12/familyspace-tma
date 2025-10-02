// backend/api/ping.ts
import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.setHeader('x-test-ping', '1');
  res.json({ ok: true, time: new Date().toISOString() });
}
