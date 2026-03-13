import { UserRole, UserStatus } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      status: UserStatus;
      isTestAccount: boolean;
      emailVerified: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    isTestAccount: boolean;
    emailVerified: boolean;
    tcVersion: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    isTestAccount: boolean;
    emailVerified: boolean;
    tcVersion: string | null;
  }
}
