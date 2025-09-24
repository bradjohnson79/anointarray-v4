import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      role?: string | null;
      isActive?: boolean | null;
    };
  }

  interface User {
    id: string;
    role?: string | null;
    isActive?: boolean | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string | null;
    isActive?: boolean | null;
  }
}
