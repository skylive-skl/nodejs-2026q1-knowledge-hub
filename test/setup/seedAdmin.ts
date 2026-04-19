import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const SEED_ADMIN_LOGIN = 'TEST_SEED_ADMIN';
export const SEED_ADMIN_PASSWORD = 'TestSeedAdmin123!';

export default async function globalSetup(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  const now = Date.now();
  try {
    await prisma.user.upsert({
      where: { login: SEED_ADMIN_LOGIN },
      update: { role: 'admin', password: hashedPassword, updatedAt: now },
      create: {
        login: SEED_ADMIN_LOGIN,
        password: hashedPassword,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
