import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/supabase-auth';
import { runConvex } from '@/lib/convexCli';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function optionsHandler() { return NextResponse.json({ ok: true }); }

async function patchHandler(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const slug = params.id;
  const patch = await request.json().catch(()=>({}));
  const out: any = await runConvex('products:updateBySlug', { slug, patch });
  if (!out?.ok) return NextResponse.json({ error: out?.error || 'Update failed' }, { status: 400 });
  return NextResponse.json({ id: slug, slug, ...patch });
}

async function deleteHandler(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const slug = params.id;
  const out: any = await runConvex('products:deleteBySlug', { slug });
  if (!out?.ok) return NextResponse.json({ error: out?.error || 'Delete failed' }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export const OPTIONS = withApiErrorHandling(optionsHandler, '/api/products/[id]');
export const PATCH = withApiErrorHandling(patchHandler as any, '/api/products/[id]');
export const DELETE = withApiErrorHandling(deleteHandler as any, '/api/products/[id]');

