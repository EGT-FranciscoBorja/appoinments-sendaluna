import type { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { insertOrUpdateCalendarTokensServer } from '@/lib/appointments/queries';

const allowedEmails = (process.env.ALLOWED_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            // Scope necesario para crear/editar eventos en Google Calendar (evitar 403 insufficient scopes)
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
          // Incremental authorization: include previously granted scopes (recommended by Google)
          // https://developers.google.com/identity/protocols/oauth2/web-server#incrementalAuth
          include_granted_scopes: 'true',
        },
      },
    }),
  ],
  callbacks: {
    signIn({ user }) {
      if (allowedEmails.length === 0) return true;
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      return allowedEmails.includes(email);
    },
    async jwt({ token, account, user }) {
      if (account?.access_token && account?.refresh_token && user?.email) {
        const expiresIn = typeof account.expires_in === 'number' ? account.expires_in : 3600;
        const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
        await insertOrUpdateCalendarTokensServer({
          email: user.email,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: expiresAt,
        });
      }
      return token;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
};

export default NextAuth(authOptions);
