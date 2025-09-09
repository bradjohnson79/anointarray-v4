import fs from 'fs/promises';

const CACHE_PATH = 'data/currency-cache.json';

type Cache = { base: string; timestamp: number; rates: Record<string, number> };

async function readCache(): Promise<Cache | null> {
  try { const raw = await fs.readFile(CACHE_PATH, 'utf-8'); return JSON.parse(raw); } catch { return null; }
}

async function writeCache(cache: Cache) {
  try { await fs.mkdir('data', { recursive: true }); await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2)); } catch {}
}

export async function getFxRate(base: string, target: string): Promise<number> {
  base = base.toUpperCase();
  target = target.toUpperCase();
  if (base === target) return 1;
  const now = Date.now();
  const cache = await readCache();
  if (cache && cache.base === base && (now - cache.timestamp) < 12 * 60 * 60 * 1000 && cache.rates[target]) {
    return cache.rates[target];
  }

  // Try network fetch (exchangerate.host)
  try {
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const json: any = await resp.json();
      const rate = Number(json?.rates?.[target]);
      if (Number.isFinite(rate) && rate > 0) {
        const newCache: Cache = { base, timestamp: now, rates: { ...(cache?.rates || {}), [target]: rate } };
        await writeCache(newCache);
        return rate;
      }
    }
  } catch {}

  // Fallback approximate rates (as of 2025, adjust as needed)
  const FALLBACK: Record<string, number> = {
    USD: 1,
    CAD: 1.35,
  };
  const toUsd = FALLBACK[base] ? 1 / FALLBACK[base] : 1; // base->USD
  const usdToTarget = FALLBACK[target] || 1; // USD->target
  return toUsd * usdToTarget;
}

export function currencySymbol(code: string): string {
  switch ((code || 'USD').toUpperCase()) {
    case 'CAD': return 'CA$';
    case 'USD': return '$';
    case 'EUR': return '€';
    default: return (code || '').toUpperCase() + ' ';
  }
}

