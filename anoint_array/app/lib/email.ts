import { Resend } from 'resend';
import { currencySymbol } from '@/lib/currency';

type Template = { subject: string; html: string };
type Templates = {
  receipt: Template;
  newsletter_optin: Template;
  vip_waitlist: Template;
  support_reply: Template;
};

import fs from 'fs/promises';
import path from 'path';

const TPL_PATH = path.join(process.cwd(), 'data', 'email-templates.json');

export async function loadTemplates(): Promise<Templates> {
  try {
    const raw = await fs.readFile(TPL_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return getDefaultTemplates();
  }
}

export function getDefaultTemplates(): Templates {
  return {
    receipt: {
      subject: 'Your ANOINT Array Receipt — {orderNumber}',
      html: `
        <div style="font-family: Arial, sans-serif; color:#111">
          <h2>Thank you for your purchase, {customerName}!</h2>
          <p>Order: <strong>{orderNumber}</strong></p>
          <h3>Items</h3>
          <div>{orderSummary}</div>
          <p><strong>Total:</strong> {total}</p>
          <h3>Shipping Address</h3>
          <div>{shippingAddress}</div>
          <p>We appreciate your support of ANOINT Array.</p>
        </div>
      `
    },
    newsletter_optin: {
      subject: 'Welcome to ANOINT Array Updates',
      html: `<p>Thanks for opting in! Expect occasional updates, product news, and helpful practices.</p>`
    },
    vip_waitlist: {
      subject: 'VIP Waitlist Confirmation',
      html: `<p>You are on the VIP waitlist. We will notify you as soon as the product is available.</p>`
    },
    support_reply: {
      subject: 'ANOINT Array Support',
      html: `<p>Hello {customerName},</p><p>{message}</p><p>Warmly,<br/>ANOINT Array Support Team</p>`
    }
  };
}

function substitute(template: string, data: Record<string, any>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (data[key] ?? ''));
}

export async function sendReceiptEmail(to: string, data: { customerName?: string; orderNumber: string; items?: Array<{ name: string; quantity: number; price: number }>; total: number; currency?: string; shippingAddress?: any }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping email send');
    return;
  }
  const resend = new Resend(apiKey);
  const templates = await loadTemplates();

  const sym = currencySymbol((data.currency || 'USD').toUpperCase());
  const orderSummary = (data.items || [])
    .map((it) => `${it.name} × ${it.quantity} — ${sym}${(it.price * it.quantity).toFixed(2)}`)
    .join('<br/>');
  const addr = data.shippingAddress ?
    `${data.shippingAddress.fullName || ''}<br/>${[data.shippingAddress.street, data.shippingAddress.address2].filter(Boolean).join(' ')}<br/>${data.shippingAddress.city || ''}, ${data.shippingAddress.state || ''} ${data.shippingAddress.zip || ''}<br/>${data.shippingAddress.country || ''}`
    : '';

  const vars = {
    customerName: data.customerName || 'Customer',
    orderNumber: data.orderNumber,
    orderSummary,
    total: `${sym}${data.total.toFixed(2)}`,
    shippingAddress: addr,
  };

  const subject = substitute(templates.receipt.subject, vars);
  const html = substitute(templates.receipt.html, vars);

  try {
    await resend.emails.send({ from, to, subject, html });
  } catch (e) {
    console.error('Failed to send receipt email:', e);
  }
}

export async function sendAdminServiceOrderEmail(to: string, data: {
  orderId: string;
  serviceName: string;
  price: number;
  currency?: string;
  customer?: { fullName?: string; email?: string; phone?: string; notes?: string };
  photoData?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';
  if (!apiKey) { console.warn('RESEND_API_KEY not set; skipping admin email'); return; }
  const resend = new Resend(apiKey);

  const sym = currencySymbol((data.currency || 'USD').toUpperCase());
  const html = `
    <div style="font-family: Arial, sans-serif; color:#111">
      <h2>New Service Order (Pending Payment)</h2>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Service:</strong> ${data.serviceName} — ${sym}${data.price.toFixed(2)}</p>
      <h3>Customer</h3>
      <div>
        ${data.customer?.fullName || ''}<br/>
        ${data.customer?.email || ''}<br/>
        ${data.customer?.phone || ''}
      </div>
      ${data.customer?.notes ? `<h3 style="margin-top:14px">Notes</h3><div>${data.customer?.notes}</div>` : ''}
      <p style="margin-top:16px">This is an automated notification so you can prepare scheduling. The payment provider will redirect the client to /success upon completion.</p>
    </div>
  `;

  const attachments: any[] = [];
  try {
    if (data.photoData && data.photoData.startsWith('data:')) {
      const [meta, b64] = data.photoData.split(',');
      const mime = (meta.match(/data:(.*?);/) || [])[1] || 'image/png';
      attachments.push({ filename: `preview.${mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] || 'png'}`, content: b64, path: undefined, contentType: mime });
    }
  } catch {}

  try {
    await resend.emails.send({ from, to, subject: `New Service Order — ${data.serviceName} (${data.orderId})`, html, attachments: attachments.length ? attachments : undefined });
  } catch (e) {
    console.error('Failed to send admin service email:', e);
  }
}
