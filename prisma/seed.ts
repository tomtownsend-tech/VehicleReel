import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@vehiclereel.co.za' },
    update: {},
    create: {
      email: 'admin@vehiclereel.co.za',
      name: 'Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'VERIFIED',
    },
  });

  // Create sample owner
  const ownerPassword = await bcrypt.hash('owner123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      name: 'John Smith',
      phone: '+27 82 123 4567',
      passwordHash: ownerPassword,
      role: 'OWNER',
      status: 'VERIFIED',
    },
  });

  // Create sample production user
  const prodPassword = await bcrypt.hash('production123', 12);
  await prisma.user.upsert({
    where: { email: 'production@example.com' },
    update: {},
    create: {
      email: 'production@example.com',
      name: 'Sarah Johnson',
      phone: '+27 83 456 7890',
      passwordHash: prodPassword,
      role: 'PRODUCTION',
      status: 'VERIFIED',
      companyName: 'Cape Films Productions',
    },
  });

  // Create sample vehicle
  const existing = await prisma.vehicle.findFirst({
    where: { ownerId: owner.id, make: 'Toyota', model: 'Hilux' },
  });

  if (!existing) {
    await prisma.vehicle.create({
      data: {
        ownerId: owner.id,
        type: 'CAR',
        make: 'Toyota',
        model: 'Hilux',
        color: 'White',
        year: 2021,
        mileage: 45000,
        condition: 'EXCELLENT',
        specialFeatures: ['Roof rack', 'Bull bar'],
        location: 'Cape Town',
        status: 'ACTIVE',
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
