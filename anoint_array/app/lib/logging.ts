import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error';

function mask(value: unknown): string {
  const v = String(value ?? '');
  if (!v) return '';
  return v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)} (len=${v.length})` : '***';
}

export function correlationId(existing?: string | null): string {
  if (existing && existing.trim()) return existing.trim();
  return crypto.randomUUID();
}

export function log(level: LogLevel, message: string, ctx?: Record<string, unknown>) {
  const base = { level, ts: new Date().toISOString(), msg: message } as Record<string, unknown>;
  const safeCtx: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx || {})) {
    // heuristic mask for secrets
    if (/key|secret|token|password|authorization/i.test(k)) {
      safeCtx[k] = mask(v as any);
    } else {
      safeCtx[k] = v;
    }
  }
  // eslint-disable-next-line no-console
  console[level]({ ...base, ...safeCtx });
}

export function startTimer() {
  const start = process.hrtime.bigint();
  return () => Number((process.hrtime.bigint() - start) / BigInt(1_000_000)); // ms
}

