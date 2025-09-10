import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const user = req.user;

    const families = await prisma.familyMembers.findMany({
      where: { userId: user.id },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        }
      }
    });

    const response = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        telegramId: user.telegramId,
        createdAt: user.createdAt
      },
      families: families.map(member => ({
        id: member.family.id,
        name: member.family.name,
        role: member.role,
        joinedAt: member.createdAt
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}