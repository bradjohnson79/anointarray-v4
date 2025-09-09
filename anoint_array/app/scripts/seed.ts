
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create test admin user
  const adminPassword = await bcrypt.hash('johndoe123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', admin.email);
  
  // Remove all existing mock products
  console.log('Clearing existing products...');
  await prisma.product.deleteMany({});
  console.log('All products cleared.');

  // NO MOCK PRODUCTS - Admin will add real products through the interface
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
