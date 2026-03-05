import Link from 'next/link';
import SignInButton from './SignInButton';
import ThemeToggle from '@/components/ThemeToggle';

export default async function AdminLoginPage() {
  // Do not redirect to /admin here when session exists: middleware uses getToken() (Edge)
  // while getServerSession() can disagree on Vercel, causing a redirect loop. After sign-in,
  // NextAuth redirects to callbackUrl (/admin) anyway.
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-600 p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Admin access</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          Sign in with your Google account to manage events and bookings.
        </p>
        <SignInButton />
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
          Only authorized accounts can access.
        </p>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          By signing in you agree to our{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 dark:text-slate-300 underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Privacy policy
          </a>
          {' '}and{' '}
          <a
            href="https://responsibletravelsa.com/en/booking-conditions/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 dark:text-slate-300 underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Booking conditions
          </a>
          .
        </p>
        <Link href="/" className="block mt-6 text-center text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
