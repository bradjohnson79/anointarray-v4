export function getCanonicalBaseUrl(preferred?: string): string {
  // Always prefer an explicit canonical URL, with a safe default
  let base = (process.env.CANONICAL_URL || preferred || 'https://anointarray.com').trim();
  // Normalize trailing slash
  base = base.replace(/\/$/, '');
  try {
    const u = new URL(base);
    const host = u.host.toLowerCase();
    // Never allow preview/localhost as a payment redirect base
    if (/vercel\.app$/.test(host) || /^localhost(?::\d+)?$/.test(host)) {
      base = 'https://anointarray.com';
    }
  } catch {
    base = 'https://anointarray.com';
  }
  return base;
}

export function logCanonicalResolution(context: string, resolved: string) {
  // Lightweight debug log to help trace misconfigurations (no secrets)
  try {
    // Only log a small, clear line; avoid noisy stacks
    console.log(`[payments] ${context}: baseUrl => ${resolved}`);
  } catch {}
}

