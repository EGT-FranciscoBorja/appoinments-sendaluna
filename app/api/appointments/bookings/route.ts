import { NextRequest, NextResponse } from 'next/server';
import {
  createBookingServer,
  getAppointmentEventByIdServer,
  updateBookingCalendarEventIdServer,
} from '@/lib/appointments/queries';
import { sendBookingNotification, sendBookingConfirmationToGuest } from '@/lib/email';
import { createCalendarEventForBooking } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_id,
      guest_name,
      guest_email,
      guest_phone,
      notes,
      number_of_attendees,
      start_at,
      end_at,
      timezone,
    } = body;

    if (
      !event_id ||
      !guest_name?.trim() ||
      !guest_email?.trim() ||
      !start_at ||
      !end_at
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, guest_name, guest_email, start_at, end_at' },
        { status: 400 }
      );
    }

    const startAtNorm = String(start_at).replace('T', ' ').slice(0, 19);
    const endAtNorm = String(end_at).replace('T', ' ').slice(0, 19);

    const booking = await createBookingServer({
      event_id: Number(event_id),
      guest_name: String(guest_name).trim(),
      guest_email: String(guest_email).trim(),
      guest_phone: guest_phone ? String(guest_phone).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      number_of_attendees:
        number_of_attendees != null && Number(number_of_attendees) >= 1
          ? Number(number_of_attendees)
          : undefined,
      start_at: startAtNorm,
      end_at: endAtNorm,
      timezone: timezone ? String(timezone) : undefined,
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please choose another.' },
        { status: 409 }
      );
    }

    const event = await getAppointmentEventByIdServer(Number(event_id));
    const notifyEmailRaw = event?.notification_email?.trim() || process.env.MAIL_NOTIFICATION_TO || '';
    const notifyEmail = notifyEmailRaw
      .split(/[;,]/)
      .map((e) => e.trim())
      .filter(Boolean)
      .join(', ');
    if (notifyEmail) {
      const sent = await sendBookingNotification({
        to: notifyEmail,
        eventTitle: event?.title ?? 'Appointment',
        guestName: String(guest_name).trim(),
        guestEmail: String(guest_email).trim(),
        guestPhone: guest_phone ? String(guest_phone).trim() : undefined,
        numberOfAttendees:
          number_of_attendees != null && Number(number_of_attendees) >= 1
            ? Number(number_of_attendees)
            : undefined,
        startAt: startAtNorm,
        endAt: endAtNorm,
        notes: notes ? String(notes).trim() : undefined,
      });
      if (!sent) {
        console.error('[Bookings] No se pudo enviar la notificación por correo a', notifyEmail, '(revisa MAIL_USERNAME/MAIL_PASSWORD y logs de Mailjet arriba).');
      }
    } else {
      console.warn('[Bookings] No notification email configured for this event or MAIL_NOTIFICATION_TO.');
    }

    // Send confirmation email to the guest
    const guestEmail = String(guest_email).trim();
    await sendBookingConfirmationToGuest({
      to: guestEmail,
      guestName: String(guest_name).trim(),
      eventTitle: event?.title ?? 'Appointment',
      startAt: startAtNorm,
      endAt: endAtNorm,
    });

    // Sincronizar con Google Calendar del administrador del evento (quien creó el evento)
    if (event?.owner_email?.trim()) {
      const calendarResult = await createCalendarEventForBooking(
        event.owner_email.trim(),
        event,
        booking
      );
      if (calendarResult.ok && calendarResult.eventId) {
        await updateBookingCalendarEventIdServer(booking.id, calendarResult.eventId);
      } else if (!calendarResult.ok) {
        console.warn(
          '[Bookings] No se pudo crear el evento en Google Calendar:',
          calendarResult.reason
        );
      }
    }

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: 'Error creating booking' }, { status: 500 });
  }
}
