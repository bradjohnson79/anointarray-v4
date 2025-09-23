import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  // Placeholder: In future, index PDFs/MDs into embeddings or notify the AI agent.
  return NextResponse.json({ success: true, message: 'update_started' });
}
