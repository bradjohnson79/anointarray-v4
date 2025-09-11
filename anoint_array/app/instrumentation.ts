import { log } from '@/lib/logging';

export async function register() {
  process.on('uncaughtException', (err) => {
    log('error', 'uncaughtException', { msg: err?.message, stack: err?.stack?.slice(0, 500) });
  });
  process.on('unhandledRejection', (reason: any) => {
    const msg = typeof reason === 'string' ? reason : reason?.message || String(reason);
    log('error', 'unhandledRejection', { msg: String(msg).slice(0, 500) });
  });
}

