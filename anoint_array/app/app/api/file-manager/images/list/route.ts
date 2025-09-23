
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
// Supabase removed. Return empty options; file manager uses /api/file-manager/images for listing.
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    return NextResponse.json({ success: true, options: [], mode: 'local' });
  } catch (error) {
    console.error('Error fetching image options:', error);
    return NextResponse.json({ error: 'Failed to fetch image options' }, { status: 500 });
  }
}
