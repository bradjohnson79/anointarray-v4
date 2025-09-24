import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { fetchConvexUserByEmail } from '@/lib/convexUsers';

function normalizeRole(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  const metadata = user?.publicMetadata ?? {};

  let role = normalizeRole((metadata as any)?.role);
  let requiresOnboarding = Boolean((metadata as any)?.requiresOnboarding ?? (metadata as any)?.onboardingRequired);

  if (!role && email) {
    try {
      const convexUser = await fetchConvexUserByEmail(email);
      role = normalizeRole(convexUser?.role);
      if (convexUser && typeof convexUser.isActive === 'boolean' && convexUser.isActive === false) {
        requiresOnboarding = false;
      }
    } catch (error) {
      console.error('Failed to load Convex role for redirect:', error);
    }
  }

  let redirectTo = '/dashboard';
  if (requiresOnboarding) {
    redirectTo = '/onboarding';
  } else if (role === 'ADMIN') {
    redirectTo = '/admin';
  }

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL(redirectTo, origin));
}
