import AppointmentsClient from '@/components/AppointmentsClient';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND_LOGO_URL } from '@/lib/constants';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto w-full px-4 py-4">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Image
              src={BRAND_LOGO_URL}
              alt="Responsible Travel"
              width={120}
              height={120}
              className="rounded-md object-contain"
            />
            <h1 className="text-lg font-semibold text-foreground">Book an appointment</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foreground/90 hover:text-foreground underline-offset-2 hover:underline"
            >
              Privacy policy
            </a>
            <ThemeToggle />
            <Link
              href="/admin"
              className="text-sm font-medium text-foreground/90 hover:text-foreground underline-offset-2 hover:underline"
            >
              Admin
            </Link>
          </div>
        </header>
        <section className="mb-6 p-4 rounded-lg bg-foreground/5 border border-foreground/10" aria-label="Application purpose">
            <h2 className="text-base font-semibold text-foreground mb-2">About this application</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              This is the <strong>Responsible Travel appointment booking service</strong>. It allows visitors to view available appointment types (e.g. meetings at trade fairs or consultations), choose a date and time, and book a slot. Administrators sign in with Google to manage events and bookings. When a booking is confirmed, the app can create the event in the administrator&apos;s Google Calendar so they see it in their schedule. Google sign-in and Calendar are used only for authenticated staff to manage appointments and sync bookings to their calendar.
            </p>
        </section>
        <p className="text-center text-sm text-foreground/70 mb-4">
          By using this service you agree to our{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-foreground"
          >
            Privacy policy
          </a>
          {' '}and{' '}
          <a
            href="https://responsibletravelsa.com/en/booking-conditions/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-foreground"
          >
            Booking conditions
          </a>
          .
        </p>
        <AppointmentsClient />
        <footer className="py-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-foreground/70">
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            Privacy policy
          </a>
          <a
            href="https://responsibletravelsa.com/en/booking-conditions/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            Booking conditions
          </a>
        </footer>
      </div>
    </main>
  );
}
