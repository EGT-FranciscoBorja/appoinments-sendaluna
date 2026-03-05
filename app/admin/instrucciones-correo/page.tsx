import Link from 'next/link';

export default function EmailInstructionsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 text-slate-700">
      <Link
        href="/admin"
        className="text-sm text-brand-blue hover:underline mb-4 inline-block"
      >
        ← Back to panel
      </Link>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">
        How to configure email sending
      </h1>
      <p className="mb-4">
        When a user books an appointment, an email is sent to the event contact.
        The app uses <strong>Mailjet</strong> (SMTP).{' '}
        <a
          href="https://dev.mailjet.com/content/guides/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-blue hover:underline"
        >
          Mailjet guides
        </a>
      </p>

      <h2 className="text-lg font-medium text-slate-800 mt-6 mb-2">Steps</h2>
      <ol className="list-decimal list-inside space-y-3 text-sm">
        <li>
          <strong>Create a Mailjet account</strong> — Sign up at mailjet.com and verify your sender email/domain.
        </li>
        <li>
          <strong>Get SMTP credentials</strong> — In Mailjet: Account Settings → SMTP & API Keys. You need the <strong>API Key</strong> (user) and <strong>Secret Key</strong> (password) for SMTP.
        </li>
        <li>
          <strong>Add variables to the project</strong> — In the project root, in <code className="bg-slate-100 px-1 rounded">.env.local</code>:
          <pre className="mt-2 p-3 bg-slate-100 rounded text-xs overflow-x-auto">
{`MAIL_MAILER=smtp
MAIL_HOST=in-v3.mailjet.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your_mailjet_api_key
MAIL_PASSWORD=your_mailjet_secret_key
MAIL_FROM_ADDRESS=info@yourdomain.com
MAIL_FROM_NAME=Appointments`}
          </pre>
          Replace with your Mailjet API Key and Secret Key. <strong>MAIL_FROM_NAME</strong> is optional (defaults to &quot;Appointments&quot;). <strong>MAIL_SIGNATURE</strong> is optional HTML at the end of each email.
        </li>
        <li>
          <strong>Restart the server</strong> — Restart <code className="bg-slate-100 px-1 rounded">npm run dev</code> to load the new variables.
        </li>
        <li>
          <strong>Test</strong> — Create an appointment type with &quot;Email for notifications&quot; set, make a test booking and check that the email arrives (and the spam folder).
        </li>
      </ol>

      <p className="mt-4 text-sm text-slate-500">
        Full documentation: <code className="bg-slate-100 px-1 rounded">docs/ADMIN-Y-EMAIL.md</code> in the repository.
      </p>
    </div>
  );
}
