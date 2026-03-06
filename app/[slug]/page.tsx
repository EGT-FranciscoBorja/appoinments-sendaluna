import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AppointmentsBySlugClient from '@/components/AppointmentsBySlugClient';
import { getAppointmentEventBySlugServer } from '@/lib/appointments/queries';
import { BRAND_LOGO_URL } from '@/lib/constants';
import ThemeToggle from '@/components/ThemeToggle';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AppointmentBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getAppointmentEventBySlugServer(slug);

  if (!event) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto w-full px-4 py-4">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Image
              src={BRAND_LOGO_URL}
              alt="Sendaluna"
              width={120}
              height={120}
              className="rounded-md object-contain"
            />
            <span className="text-lg font-semibold text-foreground">Book an appointment</span>
          </div>
          <ThemeToggle />
        </header>
        <div className="py-4">
          <AppointmentsBySlugClient initialEvent={event} />
        </div>
        <footer className="py-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-foreground/70">
          <Link
            href="/privacy-policy"
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            Privacy policy
          </Link>
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
