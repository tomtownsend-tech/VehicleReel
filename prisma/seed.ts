import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: 'vehiclereel+admin@gmail.com',
      name: 'Admin',
      password: 'VR-Admin-2026!',
      role: 'ADMIN' as const,
    },
    {
      email: 'vehiclereel+coordinator@gmail.com',
      name: 'Test Coordinator',
      password: 'VR-Coord-2026!',
      role: 'COORDINATOR' as const,
    },
    {
      email: 'vehiclereel+owner@gmail.com',
      name: 'Test Owner',
      password: 'VR-Owner-2026!',
      role: 'OWNER' as const,
    },
    {
      email: 'vehiclereel+production@gmail.com',
      name: 'Test Production',
      password: 'VR-Prod-2026!',
      role: 'PRODUCTION' as const,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        status: 'VERIFIED',
        isTestAccount: true,
        emailVerified: true,
      },
    });
    console.log(`Created ${u.role}: ${u.email}`);
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
