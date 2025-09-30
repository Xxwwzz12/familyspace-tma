import { User, Family, FamilyMembers } from '@prisma/client';
import { TelegramWidgetData } from '../../types/telegram-widget';

export interface AuthenticatedUser extends User {
  families?: Array<FamilyMembers & {
    family: Family;
  }>;
}

declare global {
  namespace Express {
    export interface Request {
      telegramWidgetData?: TelegramWidgetData;
      user?: AuthenticatedUser;
    }
    
    export interface AuthRequest extends Request {
      user: AuthenticatedUser;
    }
  }
}

// Экспортируем AuthenticatedUser для использования в других частях приложения
export { AuthenticatedUser };