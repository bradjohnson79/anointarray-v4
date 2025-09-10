import { parse } from 'cookie';

export function getAffiliateCodeFromHeaders(headers: Headers): string | null {
  try {
    const raw = headers.get('cookie') || '';
    const parsed = parse(raw || '');
    const code = parsed['an_aff'] || parsed['ga_ref'] || parsed['goaff_ref'] || '';
    return code || null;
  } catch {
    return null;
  }
}

export async function notifyGoAffProConversion(params: {
  orderId: string;
  amount: number;
  currency?: string;
  affiliateCode?: string | null;
  customerEmail?: string | null;
}) {
  try {
    const access = process.env.X_GOAFFPRO_ACCESS_TOKEN || process.env['X-GOAFFPRO-ACCESS-TOKEN'];
    const pub = process.env.X_GOAFFPRO_PUBLIC_TOKEN || process.env['X-GOAFFPRO-PUBLIC-TOKEN'];
    if (!access && !pub) return; // nothing to do

    const payload = {
      order_id: params.orderId,
      sale_amount: params.amount,
      currency: (params.currency || 'USD').toUpperCase(),
      affiliate_code: params.affiliateCode || undefined,
      customer_email: params.customerEmail || undefined,
    };

    // Heuristic endpoint (may vary per account). We try, but don't fail hard.
    const endpoints = [
      'https://api.goaffpro.com/v2/conversion',
      'https://api.goaffpro.com/track/conversion',
    ];
    const headers: any = { 'Content-Type': 'application/json' };
    if (access) headers['x-goaffpro-access-token'] = access;
    if (pub) headers['x-goaffpro-public-token'] = pub;

    for (const url of endpoints) {
      try {
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (r.ok) return;
      } catch {}
    }
  } catch (e) {
    // swallow errors; affiliate tracking is best effort
    console.warn('GoAffPro conversion notify failed (non-fatal)', e);
  }
}
