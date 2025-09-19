import { User, Family, FamilyMembers } from '@prisma/client';

export interface AuthenticatedUser extends User {
  families?: Array<FamilyMembers & {
    family: Family;
  }>;
}

declare global {
  namespace Express {
    export interface Request {
      user?: AuthenticatedUser;
    }
    
    // Явно экспортируем интерфейс AuthRequest
    export interface AuthRequest extends Request {
      user: AuthenticatedUser;
    }
  }
}

// Экспортируем AuthenticatedUser для использования в других частях приложения
export { AuthenticatedUser };