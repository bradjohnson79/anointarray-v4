import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Prefer DIRECT_URL for non-serverless scripts
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2] || '';
  const emailEnv = process.env.ADMIN_EMAIL || '';
  const email = (emailArg || emailEnv).trim().toLowerCase();
  if (!email) {
    console.error('Usage: pnpm tsx scripts/promote-admin.ts user@example.com');
    process.exit(2);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    console.error(`No user found with email ${email}`);
    process.exit(3);
  }
  if (existing.role === 'ADMIN') {
    console.log(`User ${email} is already ADMIN.`);
    return;
  }
  const updated = await prisma.user.update({ where: { email }, data: { role: 'ADMIN', isActive: true } });
  console.log(`Promoted ${updated.email} to ADMIN.`);
}

main().finally(() => prisma.$disconnect());

