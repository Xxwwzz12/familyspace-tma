import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Передаем запрос в Express приложение
  return app(req, res);
}