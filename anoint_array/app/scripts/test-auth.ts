/*
  Auth backend smoke tests (DB-level, mimics /api/signup path)
  Usage:
    # Prefer DIRECT_URL for migrations/non-pooled actions
    DIRECT_URL=postgresql://... pnpm tsx scripts/test-auth.ts
    # or
    DATABASE_URL=postgresql://... pnpm tsx scripts/test-auth.ts

  Notes:
    - Does not print secrets. Only prints masked email and test results.
    - Creates and deletes a temporary user.
*/
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return '***@***';
  const n = name.length;
  const masked = n <= 2 ? name[0] + '*' : name.slice(0, 2) + '…' + name.slice(-1);
  return `${masked}@${domain}`;
}

async function main() {
  const prisma = new PrismaClient();
  const results: Record<string, any> = {};
  const email = `qa_auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'QaAuthTest123!';
  const masked = maskEmail(email);

  try {
    // 1) Connectivity
    await prisma.$queryRawUnsafe('SELECT 1');
    results.connect = { ok: true };

    // 2) Create user
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), name: 'QA Auth User', password: hash, role: 'USER', isActive: true },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    results.create = { ok: true, user: { id: user.id, email: masked } };

    // 3) Duplicate should fail with P2002
    try {
      await prisma.user.create({ data: { email: email.toLowerCase(), name: 'Dup', password: hash, role: 'USER' } });
      results.duplicate = { ok: false, error: 'expected-unique-constraint' };
    } catch (e: any) {
      const msg = String(e?.message || e);
      results.duplicate = { ok: /P2002|Unique constraint/i.test(msg), code: 'P2002?' };
    }

    // 4) Verify password compare
    const fetched = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { password: true } });
    const passOk = fetched?.password ? await bcrypt.compare(password, fetched.password) : false;
    results.password = { ok: passOk };

    // All good?
    const ok = results.connect.ok && results.create.ok && results.duplicate.ok && results.password.ok;
    results.summary = { ok };

    console.log(JSON.stringify({ test: 'auth-backend', email: masked, results }, null, 2));
    if (!ok) process.exit(1);
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.log(JSON.stringify({ test: 'auth-backend', error: msg }, null, 2));
    process.exit(2);
  } finally {
    // Best effort cleanup
    try { await prisma.user.delete({ where: { email: email.toLowerCase() } }); } catch {}
    await prisma.$disconnect();
  }
}

main();

