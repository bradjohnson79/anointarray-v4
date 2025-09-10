import { prisma } from '@/lib/prisma';

export async function getConfig<T = any>(key: string, fallback?: T): Promise<T | undefined> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  if (row) return (row.value as T);
  return fallback;
}

export async function setConfig<T = any>(key: string, value: T): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}

export async function hasConfig(key: string): Promise<boolean> {
  const row = await prisma.appConfig.findUnique({ where: { key }, select: { id: true } });
  return !!row;
}

