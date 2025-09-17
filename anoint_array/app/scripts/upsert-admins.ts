import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Prefer DIRECT_URL for scripts to avoid serverless poolers
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

const prisma = new PrismaClient();

type AdminSeed = { email: string; name: string; role?: 'ADMIN'|'USER'; password?: string };

const targets: AdminSeed[] = [
  { email: 'bradjohnson79@gmail.com', name: 'Brad Johnson', role: 'ADMIN', password: 'Admin123' },
  { email: 'breanne@aetherx.co', name: 'Breanne Desrochers', role: 'ADMIN', password: 'Admin123' },
];

async function upsertAdmin(t: AdminSeed) {
  const email = t.email.trim().toLowerCase();
  const name = t.name.trim();
  const role = t.role || 'ADMIN';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { name, role, isActive: true },
      select: { id: true, email: true, role: true, isActive: true, name: true },
    });
    return { action: 'updated', user: updated };
  }
  const hash = await bcrypt.hash(t.password || 'Admin123', 12);
  const created = await prisma.user.create({
    data: { email, name, password: hash, role, isActive: true },
    select: { id: true, email: true, role: true, isActive: true, name: true },
  });
  return { action: 'created', user: created };
}

async function main() {
  const results = [] as any[];
  for (const t of targets) {
    results.push(await upsertAdmin(t));
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

