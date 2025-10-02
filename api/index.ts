// api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/app'; // <-- поправленный путь: из api/ в backend/src/app

// Экспортируем handler для Vercel — проксируем запросы в Express app
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express app можно вызвать напрямую как функцию
  return app(req as any, res as any);
}
