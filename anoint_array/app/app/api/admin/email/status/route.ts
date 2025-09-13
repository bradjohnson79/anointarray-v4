import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { serverEnv } from '@/lib/env';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = serverEnv.RESEND_API_KEY;
    const from = serverEnv.EMAIL_FROM || '';
    const data: any = {
      hasKey: !!apiKey,
      from,
      ok: false,
    };

    if (!apiKey) return NextResponse.json(data);

    const resend = new Resend(apiKey);

    // Try domains list
    let domains: Array<{ name: string; status: string }> = [];
    try {
      const list: any = await resend.domains.list();
      domains = (list?.data || list || []).map((d: any) => ({ name: d?.name, status: d?.status }));
      data.domains = domains;
    } catch (e: any) {
      data.domainsError = e?.message || 'Failed to list domains';
    }

    // Verify FROM domain is in verified list (if set)
    if (from && domains.length) {
      const fromDomain = String(from.split('@')[1] || '').toLowerCase();
      const match = domains.find((d) => String(d.name).toLowerCase() === fromDomain);
      data.fromDomain = fromDomain;
      data.verifiedFromDomain = !!match && match.status === 'verified';
    }

    // Try to pull recent activity if endpoint exists; ignore failures gracefully
    try {
      const resp = await fetch('https://api.resend.com/emails?limit=10', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (resp.ok) {
        const j: any = await resp.json().catch(() => null);
        data.recent = Array.isArray(j?.data) ? j.data.map((e: any) => ({ id: e?.id, to: e?.to, subject: e?.subject, status: e?.status, created_at: e?.created_at })) : undefined;
      }
    } catch {}

    data.ok = data.hasKey && ((data.domains || []).some((d: any) => d.status === 'verified')) && (from ? !!data.verifiedFromDomain : true);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load status' }, { status: 500 });
  }
}

