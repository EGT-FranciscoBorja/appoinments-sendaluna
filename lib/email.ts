/**
 * Email sending via Mailjet SMTP.
 * https://dev.mailjet.com/content/guides/
 * Env: MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_FROM_NAME (optional), MAIL_SIGNATURE (optional HTML)
 */

import nodemailer from 'nodemailer';
import { BRAND_LOGO_URL } from './constants';

const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const BODY_BG = '#f1f5f9';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const ACCENT = '#4A7BB0';

function wrapEmailBody(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment</title>
</head>
<body style="margin:0; padding:0; background-color:${BODY_BG}; font-family:${FONT_FAMILY}; font-size:16px; line-height:1.6; color:${TEXT_SECONDARY}; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BODY_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px; margin:0 auto; background-color:${CARD_BG}; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              ${content}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0 0; font-size:12px; color:${TEXT_MUTED}; text-align:center;">
          This email was sent by the appointments system.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const EMAIL_LOGO_HTML = `
  <div style="text-align:center; margin-bottom:28px;">
    <img src="${BRAND_LOGO_URL}" alt="Sendaluna" width="120" height="120" style="display:inline-block; width:80px; height:80px; object-fit:contain;" />
  </div>
`;

const DEFAULT_SIGNATURE = `
  <p style="margin-top:28px; padding-top:20px; border-top:1px solid ${BORDER}; color:${TEXT_MUTED}; font-size:14px; line-height:1.5;">
    —<br/>
    This is an automated message from the appointments system.
  </p>
`;

function sectionTitle(text: string): string {
  return `<h2 style="margin:0 0 20px 0; font-size:20px; font-weight:600; color:${TEXT_PRIMARY}; letter-spacing:-0.02em;">${text}</h2>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 12px 0; font-size:16px; line-height:1.6; color:${TEXT_SECONDARY};">${html}</p>`;
}

function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px 0; font-size:15px; line-height:1.5;"><span style="color:${TEXT_MUTED}; font-weight:500;">${label}</span> <span style="color:${TEXT_PRIMARY};">${value}</span></p>`;
}

function getFromAddress(): string {
  const raw = process.env.MAIL_FROM_ADDRESS?.trim() ?? '';
  const address = raw.replace(/^["']|["']$/g, '').trim() || 'noreply@localhost';
  const name = process.env.MAIL_FROM_NAME?.trim() || 'Appointments';
  return `${name} <${address}>`;
}

function getTransporter(): nodemailer.Transporter | null {
  // Mailjet SMTP: user = API Key, pass = Secret Key (vars MAILJET_* o MAIL_USERNAME/MAIL_PASSWORD)
  const user = process.env.MAIL_USERNAME?.trim() || process.env.MAILJET_API_KEY?.trim();
  const pass = process.env.MAIL_PASSWORD?.trim() || process.env.MAILJET_SECRET_KEY?.trim();
  if (!user || !pass) return null;
  const host = process.env.MAIL_HOST?.trim() || 'in-v3.mailjet.com';
  const port = parseInt(process.env.MAIL_PORT ?? '587', 10) || 587;
  const secure = process.env.MAIL_ENCRYPTION === 'tls' ? false : (process.env.MAIL_SCHEME === 'true');
  return nodemailer.createTransport({
    host,
    port,
    secure: !!secure,
    requireTLS: port === 587,
    auth: { user, pass },
  });
}

export async function sendBookingNotification(params: {
  to: string;
  eventTitle: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  numberOfAttendees?: number;
  startAt: string;
  endAt: string;
  notes?: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[Mailjet] Email not sent: set MAILJET_API_KEY and MAILJET_SECRET_KEY (or MAIL_USERNAME and MAIL_PASSWORD) in wrangler vars or .env.local.');
    return false;
  }

  const from = getFromAddress();
  const signatureHtml = process.env.MAIL_SIGNATURE ?? DEFAULT_SIGNATURE;
  const dateFormatted = new Date(params.startAt.replace(' ', 'T')).toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const content = `
        ${EMAIL_LOGO_HTML}
        ${sectionTitle('New booking')}
        ${detailRow('Event:', params.eventTitle)}
        ${detailRow('Guest:', params.guestName)}
        ${detailRow('Email:', params.guestEmail)}
        ${params.guestPhone ? detailRow('Phone:', params.guestPhone) : ''}
        ${params.numberOfAttendees != null ? detailRow('Attendees:', String(params.numberOfAttendees)) : ''}
        ${detailRow('Date & time:', dateFormatted)}
        ${params.notes ? paragraph(`<strong style="color:${TEXT_MUTED};">Notes:</strong> ${params.notes}`) : ''}
        ${signatureHtml}
      `;
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: `New booking: ${params.eventTitle} - ${params.guestName}`,
      html: wrapEmailBody(content),
    });
    return true;
  } catch (err) {
    console.error('[Mailjet] Send error:', err);
    return false;
  }
}

/** Sends a confirmation email to the guest who made the booking. */
export async function sendBookingConfirmationToGuest(params: {
  to: string;
  guestName: string;
  eventTitle: string;
  startAt: string;
  endAt: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = getFromAddress();
  const signatureHtml = process.env.MAIL_SIGNATURE ?? DEFAULT_SIGNATURE;
  const dateFormatted = new Date(params.startAt.replace(' ', 'T')).toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const content = `
        ${EMAIL_LOGO_HTML}
        ${sectionTitle('Your appointment is confirmed')}
        ${paragraph(`Hi ${params.guestName},`)}
        ${paragraph('Your booking has been confirmed for:')}
        <div style="margin:16px 0; padding:16px 20px; background-color:${BODY_BG}; border-radius:6px; border-left:4px solid ${ACCENT};">
          <p style="margin:0 0 4px 0; font-size:16px; font-weight:600; color:${TEXT_PRIMARY};">${params.eventTitle}</p>
          <p style="margin:0; font-size:15px; color:${TEXT_SECONDARY};">${dateFormatted}</p>
        </div>
        ${paragraph('We look forward to seeing you.')}
        ${signatureHtml}
      `;
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: `Appointment confirmed: ${params.eventTitle}`,
      html: wrapEmailBody(content),
    });
    return true;
  } catch (err) {
    console.error('[Mailjet] Guest confirmation send error:', err);
    return false;
  }
}
