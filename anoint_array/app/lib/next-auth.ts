import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { fetchConvexUserByEmail, setConvexUserPasswordHash } from '@/lib/convexUsers';

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'info@anoint.me').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const emailInput = credentials?.email;
        const passwordInput = credentials?.password;
        const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
        const password = typeof passwordInput === 'string' ? passwordInput : '';
        if (!email || !password) return null;

        let user = await fetchConvexUserByEmail(email);

        if (!user && email === DEFAULT_ADMIN_EMAIL) {
          const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
          await setConvexUserPasswordHash(email, hash);
          user = await fetchConvexUserByEmail(email);
        }

        if (!user || !user.passwordHash) return null;
        const isValid = await bcrypt.compare(password, String(user.passwordHash));
        if (!isValid) return null;
        if (user.isActive === false) return null;

        return {
          id: String(user._id || email),
          email: user.email || email,
          name: user.name || undefined,
          role: user.role || 'USER',
          isActive: user.isActive ?? true,
        } as any;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role || 'USER';
        token.isActive = (user as any).isActive ?? true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = String(token.id);
        if (token.role) session.user.role = String(token.role);
        if (typeof token.isActive !== 'undefined') {
          session.user.isActive = Boolean(token.isActive);
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
