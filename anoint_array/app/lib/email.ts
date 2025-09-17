import { Resend } from 'resend';
import { currencySymbol } from '@/lib/currency';

type Template = { subject: string; html: string };
type Templates = {
  receipt: Template;
  newsletter_optin: Template;
  vip_waitlist: Template;
  support_reply: Template;
  signup_confirmation: Template;
};

import fs from 'fs/promises';
import path from 'path';

const TPL_PATH = path.join(process.cwd(), 'data', 'email-templates.json');

async function sendViaProvider(args: { from: string; to: string | string[]; subject: string; html: string; attachments?: Array<{ filename?: string; content?: string; contentType?: string }> }) {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const resendKey = process.env.RESEND_API_KEY || '';
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN || '';
  const stream = process.env.POSTMARK_MESSAGE_STREAM || 'outbound';

  // Prefer explicit provider; otherwise fallback to available credentials
  if (provider === 'postmark' || (!resendKey && postmarkToken)) {
    const pmAttachments = (args.attachments || []).map((a) => ({
      Name: a.filename || 'attachment',
      Content: (a.content || ''),
      ContentType: a.contentType || 'application/octet-stream',
    }));
    const resp = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Postmark-Server-Token': postmarkToken },
      body: JSON.stringify({
        From: args.from,
        To: Array.isArray(args.to) ? args.to.join(',') : args.to,
        Subject: args.subject,
        HtmlBody: args.html,
        MessageStream: stream,
        Attachments: pmAttachments.length ? pmAttachments : undefined,
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('Postmark send failed:', t);
    }
    return;
  }

  if (!resendKey) {
    console.warn('No email provider configured: set RESEND_API_KEY or POSTMARK_SERVER_TOKEN');
    return;
  }
  const resend = new Resend(resendKey);
  await resend.emails.send({ from: args.from, to: args.to as any, subject: args.subject, html: args.html, attachments: args.attachments as any });
}

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
    signup_confirmation: {
      subject: 'Welcome to ANOINT Array — Confirm your email',
      html: `<div style="font-family: Arial, sans-serif; color:#111">
        <h2>Welcome, {customerName}!</h2>
        <p>Thanks for creating an account at ANOINT Array.</p>
        <p style="margin:18px 0">Please confirm your email to activate your account.</p>
        <p style="margin:20px 0"><a href="{verifyUrl}" style="background:#6d28d9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirm Email</a></p>
        <p>If the button doesn’t work, copy and paste this URL into your browser:<br/>{verifyUrl}</p>
      </div>`
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
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';
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

  try { await sendViaProvider({ from, to, subject, html }); } catch (e) { console.error('Failed to send receipt email:', e); }
}

export async function sendAdminServiceOrderEmail(to: string | string[], data: {
  orderId: string;
  serviceName: string;
  price: number;
  currency?: string;
  customer?: { fullName?: string; email?: string; phone?: string; notes?: string };
  photoData?: string;
}) {
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';

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

  try { await sendViaProvider({ from, to, subject: `New Service Order — ${data.serviceName} (${data.orderId})`, html, attachments }); }
  catch (e) { console.error('Failed to send admin service email:', e); }
}

export async function sendPasswordResetEmail(to: string, args: { resetUrl: string }) {
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';
  const html = `
    <div style="font-family: Arial, sans-serif; color:#111">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your ANOINT Array password.</p>
      <p>If this was you, click the button below to set a new password. This link will expire in 60 minutes.</p>
      <p style="margin:20px 0"><a href="${args.resetUrl}" style="background:#6d28d9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Reset Password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  try { await sendViaProvider({ from, to, subject: 'Reset your ANOINT Array password', html }); }
  catch (e) { console.error('Failed to send password reset email:', e); }
}

export async function sendSignupConfirmationEmail(to: string, args: { customerName?: string; verifyUrl?: string }) {
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';
  const templates = await loadTemplates();
  const vars = {
    customerName: args.customerName || 'Friend',
    verifyUrl: args.verifyUrl || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''}/auth/login`,
  } as any;
  const subject = substitute(templates.signup_confirmation.subject, vars);
  const html = substitute(templates.signup_confirmation.html, vars);
  try { await sendViaProvider({ from, to, subject, html }); }
  catch (e) { console.error('Failed to send signup confirmation email:', e); }
}

export async function sendNewsletterOptInEmail(to: string, args?: { customerName?: string }) {
  const from = process.env.EMAIL_FROM || 'noreply@anointarray.com';
  const templates = await loadTemplates();
  const vars = { customerName: args?.customerName || 'Friend' } as any;
  const subject = substitute(templates.newsletter_optin.subject, vars);
  const html = substitute(templates.newsletter_optin.html, vars);
  try { await sendViaProvider({ from, to, subject, html }); }
  catch (e) { console.error('Failed to send newsletter opt-in email:', e); }
}
