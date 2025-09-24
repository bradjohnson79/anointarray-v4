import type { NextRequest } from 'next/server';
import { handleProfileGet, handleProfilePatch } from './shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return handleProfileGet(req);
}

export async function PATCH(req: NextRequest) {
  return handleProfilePatch(req);
}
