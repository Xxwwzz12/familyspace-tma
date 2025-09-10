import { User, Family, FamilyMembers } from '@prisma/client';

export interface AuthenticatedUser extends User {
  families?: Array<FamilyMembers & {
    family: Family;
  }>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Экспорт для использования в других частях приложения
export {};