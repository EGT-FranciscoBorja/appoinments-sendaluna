'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Protects /admin routes when proxy/middleware is not available (e.g. OpenNext/Cloudflare).
 * Redirects to /admin/login if unauthenticated, except when already on /admin/login.
 */
export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) return;
    if (status === 'unauthenticated') {
      router.replace('/admin/login');
    }
  }, [status, isLoginPage, router]);

  if (!isLoginPage && (status === 'unauthenticated' || status === 'loading')) {
    return null; // avoid flash of admin content before redirect or while checking session
  }

  return <>{children}</>;
}
