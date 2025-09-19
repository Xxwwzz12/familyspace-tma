import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    telegramId: bigint;
    firstName: string;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null; // Добавлено
    isBot: boolean; // Добавлено
    createdAt: Date;
    updatedAt: Date; // Добавлено
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        photoUrl: true, // Добавлено
        isBot: true, // Добавлено
        createdAt: true,
        updatedAt: true // Добавлено
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};