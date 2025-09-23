import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Restores products + variants from the latest backup in Supabase Storage (configs/backups/...json)
export async function POST() {
  try {
    await requireAdmin();
    const dir = path.join(process.cwd(), 'data', 'backups');
    const files = await fs.readdir(dir).catch(()=>[] as string[]);
    const backups = files.filter(n=> n.endsWith('.json')).sort((a,b)=> a > b ? -1 : 1);
    if (!backups.length) return NextResponse.json({ error: 'No backups found in data/backups' }, { status: 404 });
    const latest = backups[0];
    const text = await fs.readFile(path.join(dir, latest), 'utf-8').catch(()=> '');
    const snapshot = JSON.parse(text || '{}');
    const products = Array.isArray(snapshot?.products) ? snapshot.products : [];

    // Wipe current data then insert snapshot (safe for small sets)
    // This route previously restored to Supabase; now encourage using /api/admin/products/restore-convex
    // For compatibility, just respond with a hint.
    return NextResponse.json({ ok: false, message: 'Use /api/admin/products/restore-convex to restore into Convex', snapshotCount: products.length, backup: latest });

    
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Restore failed' }, { status: 500 });
  }
}
