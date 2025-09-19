// Prisma has been removed from this codebase.
// This placeholder prevents import errors during migration.
// Any attempt to use `prisma` at runtime will throw.

export const prisma: any = new Proxy({}, {
  get() {
    throw new Error('Prisma is removed. Use Supabase client instead.');
  }
});

export function selectedDbUrl(): string | undefined {
  return undefined;
}

