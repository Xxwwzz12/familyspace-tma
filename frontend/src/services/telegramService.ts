import { retrieveLaunchParams } from '@telegram-apps/sdk';

export class TelegramService {
  async getInitData(): Promise<string> {
    // 1) native WebApp (если внутри Telegram)
    const nativeInit = (globalThis as any).Telegram?.WebApp?.initData;
    if (nativeInit) {
      if (!this.isValidInitData(nativeInit)) {
        throw new Error('Invalid initData from Telegram WebApp');
      }
      return nativeInit;
    }

    // 2) попробовать retrieveLaunchParams()
    try {
      const lp = await retrieveLaunchParams();
      if (typeof lp === 'string' && this.isValidInitData(lp)) {
        return lp;
      }
      if (lp && typeof lp === 'object') {
        const maybe = (lp as any).tgWebAppData || (lp as any).initData;
        if (typeof maybe === 'string' && this.isValidInitData(maybe)) {
          return maybe;
        }
      }
    } catch (e) {
      console.warn('retrieveLaunchParams failed:', e);
    }

    // 3) fallback для dev
    if (import.meta.env.DEV) {
      return this.generateFallbackData();
    }

    throw new Error('Telegram WebApp not available');
  }

  async initTelegramAuth(): Promise<string> {
    try {
      return await this.getInitData();
    } catch (error) {
      console.error('Ошибка получения initData:', error);
      throw new Error('Failed to get authentication data from Telegram environment');
    }
  }

  private isValidInitData(initData: string): boolean {
    try {
      const params = new URLSearchParams(initData);
      return params.has('hash');
    } catch {
      return false;
    }
  }

  private generateFallbackData(): string {
    const mockUser = {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
    };
    const initData = new URLSearchParams({
      user: JSON.stringify(mockUser),
      hash: 'development_fallback_hash',
      auth_date: Math.floor(Date.now() / 1000).toString(),
    });
    return initData.toString();
  }
}

// Функция для проверки доступности Telegram Mini App
export const isTMAavailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
};

export const telegramService = new TelegramService();