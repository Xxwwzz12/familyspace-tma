import { Request, Response, NextFunction } from 'express';

export const telegramAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement Telegram WebApp data validation
  console.log('Telegram auth middleware is working (stub)');
  next();
};