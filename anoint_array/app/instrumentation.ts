import { log } from '@/lib/logging';

async function autoMigrate() {
  try {
    if (process.env.AUTO_MIGRATE_CONVEX !== '1') return;
    const token = process.env.MIGRATION_TOKEN || '';
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    await fetch(base + '/api/admin/products/restore-convex', { method: 'POST', headers: token ? { 'x-internal-token': token } as any : {} as any }).catch(() => {});
    await fetch(base + '/api/admin/file-manager/migrate-to-s3', { method: 'POST', headers: token ? { 'x-internal-token': token } as any : {} as any }).catch(() => {});
  } catch {}
}

export async function register() {
  process.on('uncaughtException', (err) => {
    log('error', 'uncaughtException', { msg: err?.message, stack: err?.stack?.slice(0, 500) });
  });
  process.on('unhandledRejection', (reason: any) => {
    const msg = typeof reason === 'string' ? reason : reason?.message || String(reason);
    log('error', 'unhandledRejection', { msg: String(msg).slice(0, 500) });
  });
  autoMigrate();
}
