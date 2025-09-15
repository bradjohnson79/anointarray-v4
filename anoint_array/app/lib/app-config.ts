import { prisma } from '@/lib/prisma';

async function ensureTable() {
  try {
    // Quick existence check
    await prisma.$queryRawUnsafe('select 1 from app_config limit 1');
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/relation\s+"?app_config"?\s+does not exist/i.test(msg)) {
      await prisma.$executeRawUnsafe(`
        create table if not exists app_config (
          id text not null,
          key text not null unique,
          value jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);
    }
  }
}

export async function getConfig<T = any>(key: string, fallback?: T): Promise<T | undefined> {
  await ensureTable();
  const row = await prisma.appConfig.findUnique({ where: { key } });
  if (row) return (row.value as T);
  return fallback;
}

export async function setConfig<T = any>(key: string, value: T): Promise<void> {
  await ensureTable();
  await prisma.appConfig.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}

export async function hasConfig(key: string): Promise<boolean> {
  await ensureTable();
  const row = await prisma.appConfig.findUnique({ where: { key }, select: { id: true } });
  return !!row;
}
