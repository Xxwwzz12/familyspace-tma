import { PrismaClient, User, Prisma } from '@prisma/client';
import { TelegramUser } from '../types/telegram';

const prisma = new PrismaClient();

export async function findOrCreateUser(telegramUser: TelegramUser): Promise<User> {
  const { id, first_name, last_name, username } = telegramUser;
  
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Поиск существующего пользователя
    const existingUser = await tx.user.findUnique({
      where: { telegramId: id }
    });

    if (existingUser) {
      // Обновление данных при изменении
      return tx.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: first_name,
          lastName: last_name || null,
          username: username || null,
        }
      });
    }

    // Создание нового пользователя
    return tx.user.create({
      data: {
        telegramId: id,
        firstName: first_name,
        lastName: last_name || null,
        username: username || null,
        isBot: false
      }
    });
  });
}