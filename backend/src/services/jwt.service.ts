// src/services/jwt.service.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Проверка наличия секрета при инициализации модуля
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

export function generateToken(userId: string): string {
    // Дополнительная проверка на случай, если переменная стала undefined после инициализации
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not available');
    }
    
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { sub: string } {
    // Дополнительная проверка на случай, если переменная стала undefined после инициализации
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not available');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        
        // Проверка наличия обязательного поля sub
        if (!decoded.sub) {
            throw new Error('Token sub is missing');
        }
        
        return { sub: decoded.sub };
    } catch (error) {
        if (error instanceof Error) {
            throw error; // Пробрасываем уже созданные ошибки
        }
        throw new Error('Invalid or expired token');
    }
}