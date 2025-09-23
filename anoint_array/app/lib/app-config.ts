import { callConvex } from '@/lib/convexHttp';

export async function getConfig<T = any>(key: string, fallback?: T): Promise<T | undefined> {
  try {
    const value = await callConvex({ functionPath: 'appConfig:get', args: { key } });
    return (value === undefined ? fallback : (value as T));
  } catch { return fallback; }
}

export async function setConfig<T = any>(key: string, value: T): Promise<void> {
  await callConvex({ functionPath: 'appConfig:set', args: { key, value } });
}

export async function hasConfig(key: string): Promise<boolean> {
  try { return !!(await callConvex({ functionPath: 'appConfig:has', args: { key } })); }
  catch { return false; }
}
