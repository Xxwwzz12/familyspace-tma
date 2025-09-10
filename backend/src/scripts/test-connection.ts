import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Простая проверка подключения
    await prisma.$connect();
    console.log('✅ Connected to database successfully');

    // Попытка выполнить простой запрос
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test passed:', result);

    // Проверка существующих пользователей
    const users = await prisma.user.findMany();
    console.log('✅ Users in database:', users.length);

  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();