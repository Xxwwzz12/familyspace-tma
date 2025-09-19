import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PrismaClient, FamilyMembers, MemberRole } from '@prisma/client';

const prisma = new PrismaClient();

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const families = await prisma.familyMembers.findMany({
      where: { userId: user.id },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    const familiesWithRole = families.map((member: FamilyMembers & { 
      family: { 
        id: string; 
        name: string | null; 
        createdAt: Date; 
      }; 
      role: MemberRole;
    }) => ({
      id: member.family.id,
      name: member.family.name,
      role: member.role,
      joinedAt: member.family.createdAt,
    }));

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      telegramId: user.telegramId.toString(),
      families: familiesWithRole,
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};