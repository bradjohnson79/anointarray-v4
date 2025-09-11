import { NextRequest, NextResponse } from 'next/server';
import { log, correlationId, startTimer } from '@/lib/logging';
import { HttpError } from '@/lib/http-errors';

type Handler = (req: NextRequest) => Promise<Response> | Response;

export function withApiErrorHandling(handler: Handler, route: string): Handler {
  return async function wrapped(req: NextRequest): Promise<Response> {
    const cid = correlationId(req.headers.get('x-request-id'));
    const end = startTimer();
    try {
      const res = await handler(req);
      const ms = end();
      log('info', 'api:ok', { route, cid, ms, status: (res as any)?.status || 200, method: req.method });
      const r = new Response(res.body, res);
      r.headers.set('x-correlation-id', cid);
      return r;
    } catch (e: any) {
      const ms = end();
      const r = mapError(e, route, cid, req.method || 'GET', ms);
      return r;
    }
  };
}

export function withApiErrorHandlingCtx<TCtx>(
  handler: (req: NextRequest, ctx: TCtx) => Promise<Response> | Response,
  route: string
) {
  return async function wrapped(req: NextRequest, ctx: TCtx): Promise<Response> {
    const cid = correlationId(req.headers.get('x-request-id'));
    const end = startTimer();
    try {
      const res = await handler(req, ctx);
      const ms = end();
      log('info', 'api:ok', { route, cid, ms, status: (res as any)?.status || 200, method: req.method });
      const r = new Response(res.body, res);
      r.headers.set('x-correlation-id', cid);
      return r;
    } catch (e: any) {
      const ms = end();
      const r = mapError(e, route, cid, req.method || 'GET', ms);
      return r;
    }
  };
}

function mapError(e: any, route: string, cid: string, method: string, ms: number) {
  let status = 500;
  let body: any = { error: 'Internal server error', cid };
  const msg = String(e?.message || e);
  if (msg.includes('P2002') || /Unique constraint/i.test(msg)) {
    status = 409; body = { error: 'Resource already exists', code: 'DUPLICATE', cid };
  }
  if (e instanceof HttpError) {
    status = e.status; body = { error: e.message, code: e.code, cid };
  }
  if (/invalid json|unexpected token in json/i.test(msg)) {
    status = 400; body = { error: 'Invalid JSON body', code: 'BAD_JSON', cid };
  }
  log('error', 'api:error', { route, cid, ms, status, method, msg });
  return NextResponse.json(body, { status, headers: { 'x-correlation-id': cid } });
}
