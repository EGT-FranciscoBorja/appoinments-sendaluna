import AppointmentsAdminClient from '@/components/AppointmentsAdminClient';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import SignOutButton from '@/components/SignOutButton';
import ThemeToggle from '@/components/ThemeToggle';
import { BRAND_LOGO_URL } from '@/lib/constants';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto w-full px-4 py-6 pb-8">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Image
              src={BRAND_LOGO_URL}
              alt="Sendaluna"
              width={120}
              height={120}
              className="rounded-md object-contain"
            />
            <h1 className="text-lg font-semibold text-foreground">Admin panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {session?.user?.email && (
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
            )}
            <SignOutButton />
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to booking
            </Link>
          </div>
        </header>
        <AppointmentsAdminClient />
      </div>
    </main>
  );
}
