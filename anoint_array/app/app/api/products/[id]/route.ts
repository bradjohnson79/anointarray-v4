import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function optionsHandler() { return NextResponse.json({ ok: true }); }

async function getHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const slug = params.id;
  try {
    let p: any;
    try { p = await runConvex('products:bySlug', { slug }); }
    catch { p = await callConvex({ functionPath: 'products:bySlug', args: { slug } }); }
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(p);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const slug = params.id;
  const raw = await request.json().catch(()=>({}));
  const patch: any = { ...raw };
  if (patch.sortOrder !== undefined) {
    const n = Number(patch.sortOrder);
    if (Number.isFinite(n)) patch.sortOrder = n; else delete patch.sortOrder;
  }
  let out: any;
  try { out = await runConvex('products:updateBySlug', { slug, patch }); }
  catch { out = await callConvex({ functionPath: 'products:updateBySlug', args: { slug, patch } }); }
  if (!out?.ok) return NextResponse.json({ error: out?.error || 'Update failed' }, { status: 400 });
  return NextResponse.json({ id: slug, slug, ...patch });
}

async function deleteHandler(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const slug = params.id;
  let out: any;
  try { out = await runConvex('products:deleteBySlug', { slug }); }
  catch { out = await callConvex({ functionPath: 'products:deleteBySlug', args: { slug } }); }
  if (!out?.ok) return NextResponse.json({ error: out?.error || 'Delete failed' }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export const OPTIONS = withApiErrorHandling(optionsHandler, '/api/products/[id]');
export const GET = withApiErrorHandling(getHandler as any, '/api/products/[id]');
export const PATCH = withApiErrorHandling(patchHandler as any, '/api/products/[id]');
export const DELETE = withApiErrorHandling(deleteHandler as any, '/api/products/[id]');
