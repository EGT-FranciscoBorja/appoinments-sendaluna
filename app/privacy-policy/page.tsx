import Link from 'next/link';
import Image from 'next/image';
import { BRAND_LOGO_URL } from '@/lib/constants';

export const metadata = {
  title: 'Privacy policy | Responsible Travel Appointments',
  description: 'Privacy policy for the Responsible Travel appointment booking service, including how we use and share Google user data.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <header className="flex items-center justify-between py-4 border-b border-foreground/10">
          <div className="flex items-center gap-3">
            <Image
              src={BRAND_LOGO_URL}
              alt="Responsible Travel"
              width={80}
              height={80}
              className="rounded-md object-contain"
            />
            <h1 className="text-lg font-semibold text-foreground">Privacy policy</h1>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-foreground/90 hover:text-foreground underline-offset-2 hover:underline"
          >
            Back to home
          </Link>
        </header>

        <div className="prose prose-slate dark:prose-invert max-w-none mt-8 text-foreground/90">
          <p className="text-sm leading-relaxed mb-6">
            This privacy policy applies to the <strong>Responsible Travel appointment booking service</strong> at appointments.responsibletravelsa.com. It describes how we collect, use, and disclose information, including data obtained through Google sign-in and Google Calendar.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6 mb-2">Information we collect</h2>
          <ul className="list-disc pl-5 text-sm space-y-1 mb-6">
            <li><strong>Booking data:</strong> When you make a booking, we collect your name, email, phone (optional), and the appointment details you submit.</li>
            <li><strong>Google user data (administrators only):</strong> When you sign in as an administrator with Google, we receive your email address, name, and profile picture. If you use Google Calendar sync, we store refresh tokens to create and manage calendar events for your bookings. We use Google&apos;s APIs only to provide the booking and calendar features of this service.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground mt-6 mb-2">Sharing, transfer, and disclosure of data — including Google user data</h2>
          <p className="text-sm leading-relaxed mb-2">
            We do <strong>not sell</strong> your personal data or Google user data. We do <strong>not share, transfer, or disclose</strong> Google user data to third parties for their advertising or marketing.
          </p>
          <p className="text-sm leading-relaxed mb-2">
            We share, transfer, or disclose data (including Google user data) only as follows:
          </p>
          <ul className="list-disc pl-5 text-sm space-y-1 mb-6">
            <li><strong>Cloudflare:</strong> Our app is hosted on Cloudflare. Booking data and, for administrators, Google account identifiers and calendar tokens are stored in Cloudflare D1 (database) and processed on Cloudflare Workers. Cloudflare acts as a service provider to host and run the application.</li>
            <li><strong>Mailjet (or our email provider):</strong> We use an email service to send booking confirmations and notifications. Recipient email addresses and booking details included in those messages are processed by the provider to deliver the emails.</li>
            <li><strong>Google:</strong> When you use &quot;Sign in with Google&quot; or Google Calendar sync, we use Google&apos;s OAuth and Calendar APIs. Data is sent to and from Google in accordance with Google&apos;s APIs and their privacy policy. We do not share Google user data with any other parties beyond what is necessary to operate this service.</li>
          </ul>
          <p className="text-sm leading-relaxed mb-6">
            We do not disclose Google user data to any other third parties. We do not use Google user data for purposes unrelated to this appointment booking and calendar service.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6 mb-2">Data protection mechanisms for sensitive data</h2>
          <p className="text-sm leading-relaxed mb-2">
            We implement security procedures and technical measures to protect the confidentiality and integrity of your data, including Google user data and other sensitive information:
          </p>
          <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
            <li><strong>Encryption in transit:</strong> All data is transmitted over HTTPS (TLS) so that information between your browser and our servers is encrypted.</li>
            <li><strong>Secure storage:</strong> Booking data and administrator credentials (including Google OAuth tokens) are stored in a managed database (Cloudflare D1) with access restricted to the application and authorized operators only. We do not store passwords; Google sign-in is handled via OAuth.</li>
            <li><strong>Access controls:</strong> Access to backend systems and stored data is limited to personnel who need it to operate the service. Administrator (Google) data is used only to provide sign-in and calendar sync for that administrator.</li>
            <li><strong>Confidentiality:</strong> We do not use your data for advertising, and we do not sell or share Google user data with third parties for their marketing or other purposes. Security procedures are in place to protect the confidentiality of your data.</li>
          </ul>
          <p className="text-sm leading-relaxed mb-6">
            We retain booking and administrator data only for as long as needed to operate the service and comply with legal obligations. When the retention period ends or you request deletion, we delete or anonymize the data. You may request deletion of your data by contacting us (see Contact below).
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6 mb-2">Contact</h2>
          <p className="text-sm leading-relaxed mb-6">
            For questions about this policy or your data, contact Responsible Travel via the main site at{' '}
            <a href="https://responsibletravelsa.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">responsibletravelsa.com</a>.
          </p>
        </div>

        <footer className="py-6 border-t border-foreground/10 text-sm text-foreground/70">
          <Link href="/" className="hover:text-foreground underline-offset-2 hover:underline">
            ← Back to home
          </Link>
        </footer>
      </div>
    </main>
  );
}
