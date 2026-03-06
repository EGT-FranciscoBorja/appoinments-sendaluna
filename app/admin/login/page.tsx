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
      <div className="max-w-sm w-full bg-card text-card-foreground rounded-2xl shadow border border-border p-8">
        <h1 className="text-xl font-semibold text-foreground mb-2">Admin access</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in with your Google account to manage events and bookings.
        </p>
        <SignInButton />
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Only authorized accounts can access.
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing in you agree to our{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 underline underline-offset-2 hover:text-foreground"
          >
            Privacy policy
          </a>
          {' '}and{' '}
          <a
            href="https://sendaluna.com/booking-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 underline underline-offset-2 hover:text-foreground"
          >
            Booking conditions
          </a>
          .
        </p>
        <Link href="/" className="block mt-6 text-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
