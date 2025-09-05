declare namespace Express {
  export interface Request {
    user?: {
      telegramId: number;
      firstName: string;
      lastName?: string;
      username?: string;
      photoUrl?: string;
    };
  }
}