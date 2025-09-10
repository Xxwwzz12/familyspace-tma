// src/services/family.service.ts
import { PrismaClient, MemberRole } from '@prisma/client';
import cuid from 'cuid';

const prisma = new PrismaClient();

// Вынесем функцию проверки прав администратора отдельно
const checkUserIsAdmin = async (familyId: string, userId: string): Promise<boolean> => {
  try {
    console.log('Checking admin rights for user:', userId, 'in family:', familyId);
    
    if (!userId || !familyId) {
      console.log('Missing parameters for checkUserIsAdmin');
      return false;
    }
    
    const membership = await prisma.familyMembers.findUnique({
      where: {
        userId_familyId: {
          userId: userId,
          familyId: familyId
        }
      }
    });

    console.log('Membership found:', membership);
    
    if (!membership) {
      return false;
    }
    
    const isAdmin = membership.role === MemberRole.ADMIN;
    console.log('Is admin:', isAdmin);
    
    return isAdmin;
  } catch (error) {
    console.error('Error in checkUserIsAdmin:', error);
    return false;
  }
};

export const familyService = {
  createFamily: async (userId: string, name?: string) => {
    try {
      console.log('Creating family for user:', userId);
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const familyName = name || `Семья ${Date.now()}`;
      const inviteCode = cuid();

      console.log('Generated family name:', familyName);
      console.log('Generated invite code:', inviteCode);

      const family = await prisma.family.create({
        data: {
          name: familyName,
          inviteCode,
          members: {
            create: {
              userId: userId,
              role: MemberRole.ADMIN
            }
          }
        },
        include: {
          members: true
        }
      });

      console.log('Family created successfully:', family);
      return family;
    } catch (error) {
      console.error('Detailed error in createFamily:', error);
      throw new Error('Не удалось создать семью');
    }
  },

  generateInviteCode: async (familyId: string, userId: string): Promise<string> => {
    const callId = Math.random().toString(36).substring(2, 8);
    
    try {
      console.log(`[${callId}] generateInviteCode called with:`, { familyId, userId });

      // Сохраняем параметры в локальные константы для избежания изменений
      const currentFamilyId = familyId;
      const currentUserId = userId;
      
      // Проверяем параметры в начале метода
      if (!currentUserId || !currentFamilyId) {
        console.log(`[${callId}] Missing parameters:`, { userId: currentUserId, familyId: currentFamilyId });
        throw new Error('User ID and Family ID are required');
      }

      console.log(`[${callId}] Checking admin rights...`);
      // Используем вынесенную функцию вместо обращения к familyService
      const isAdmin = await checkUserIsAdmin(currentFamilyId, currentUserId);
      console.log(`[${callId}] Is admin:`, isAdmin);

      if (!isAdmin) {
        throw new Error('Недостаточно прав доступа');
      }

      const family = await prisma.family.findUnique({
        where: { id: currentFamilyId },
      });

      if (!family) {
        throw new Error('Семья не найдена');
      }

      const newInviteCode = cuid();
      
      await prisma.family.update({
        where: { id: currentFamilyId },
        data: { inviteCode: newInviteCode },
      });

      console.log(`[${callId}] Generated new invite code:`, newInviteCode);
      return newInviteCode;
    } catch (error) {
      console.error(`[${callId}] Error in generateInviteCode:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Не удалось сгенерировать инвайт-код');
    }
  },

  joinFamily: async (inviteCode: string, userId: string) => {
    try {
      console.log('Joining family with invite code:', inviteCode);
      console.log('User ID:', userId);

      if (!userId || !inviteCode) {
        throw new Error('User ID and Invite code are required');
      }

      const family = await prisma.family.findUnique({
        where: { inviteCode },
      });

      if (!family) {
        throw new Error('Неверный инвайт-код');
      }

      const existingMembership = await prisma.familyMembers.findUnique({
        where: {
          userId_familyId: {
            userId: userId,
            familyId: family.id,
          },
        },
      });

      if (existingMembership) {
        throw new Error('Пользователь уже является членом семьи');
      }

      const membership = await prisma.familyMembers.create({
        data: {
          familyId: family.id,
          userId,
          role: MemberRole.USER,
        },
      });

      console.log('Successfully joined family:', membership);
      return membership;
    } catch (error) {
      console.error('Error in joinFamily:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Не удалось присоединиться к семье');
    }
  },

  checkUserIsAdmin: async (familyId: string, userId: string): Promise<boolean> => {
    return checkUserIsAdmin(familyId, userId);
  },

  getFamilyById: async (familyId: string) => {
    try {
      if (!familyId) {
        throw new Error('Family ID is required');
      }
      
      return await prisma.family.findUnique({
        where: { id: familyId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error('Error in getFamilyById:', error);
      throw new Error('Не удалось найти семью');
    }
  },

  checkUserMembership: async (familyId: string, userId: string): Promise<boolean> => {
    try {
      if (!userId || !familyId) {
        return false;
      }
      
      const membership = await prisma.familyMembers.findUnique({
        where: {
          userId_familyId: {
            userId: userId,
            familyId: familyId
          }
        }
      });

      return !!membership;
    } catch (error) {
      console.error('Error in checkUserMembership:', error);
      return false;
    }
  }
};

export default familyService;