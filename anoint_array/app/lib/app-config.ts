import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export async function getConfig<T = any>(key: string, fallback?: T): Promise<T | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) return fallback;
  if (data && (data as any).value != null) return (data as any).value as T;
  return fallback;
}

export async function setConfig<T = any>(key: string, value: T): Promise<void> {
  const supabase = createSupabaseAdminClient();
  // Upsert by unique key
  await supabase
    .from('app_config')
    .upsert({ key, value: value as any }, { onConflict: 'key' });
}

export async function hasConfig(key: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from('app_config')
    .select('*', { count: 'exact', head: true })
    .eq('key', key);
  return !!(count && count > 0);
}
