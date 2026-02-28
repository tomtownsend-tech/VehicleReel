import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { UserRole, UserStatus } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;
        if (user.status === 'BANNED') return null;
        if (user.status === 'SUSPENDED') return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: UserRole }).role;
        token.status = (user as unknown as { status: UserStatus }).status;
        token.lastRefresh = Date.now();
      }

      // Refresh user status from DB every 5 minutes to catch bans/suspensions
      const fiveMinutes = 5 * 60 * 1000;
      if (!token.lastRefresh || Date.now() - (token.lastRefresh as number) > fiveMinutes) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, role: true },
          });
          if (freshUser) {
            token.status = freshUser.status;
            token.role = freshUser.role;
          }
          token.lastRefresh = Date.now();
        } catch {
          // If DB check fails, keep existing token data
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
