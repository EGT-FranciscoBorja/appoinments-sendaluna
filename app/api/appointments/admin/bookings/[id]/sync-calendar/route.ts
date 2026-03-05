import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getBookingByIdServer,
  getAppointmentEventByIdServer,
  updateBookingCalendarEventIdServer,
} from '@/lib/appointments/queries';
import { createCalendarEventForBooking } from '@/lib/google-calendar';

function canEditEvent(ownerEmail: string | null, currentUserEmail: string): boolean {
  if (ownerEmail == null || ownerEmail === '') return true;
  return ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
}

/**
 * POST: crea el evento en Google Calendar para una reserva que aún no tiene google_calendar_event_id.
 * Útil para sincronizar reservas que fallaron al crear el evento (p. ej. 403 por scopes).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const booking = await getBookingByIdServer(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const event = await getAppointmentEventByIdServer(booking.event_id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!canEditEvent(event.owner_email, token.email as string)) {
      return NextResponse.json(
        { error: 'Forbidden: you can only sync bookings of your own events' },
        { status: 403 }
      );
    }

    if (booking.google_calendar_event_id) {
      return NextResponse.json({ ok: true, alreadySynced: true, eventId: booking.google_calendar_event_id });
    }

    const ownerEmail = event.owner_email?.trim();
    if (!ownerEmail) {
      return NextResponse.json(
        { ok: false, reason: 'no_owner', message: 'El evento no tiene dueño (owner_email). No se puede crear en Calendar.' },
        { status: 400 }
      );
    }

    const result = await createCalendarEventForBooking(ownerEmail, event, booking);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason, message: result.reason },
        { status: 200 }
      );
    }

    if (result.eventId) {
      await updateBookingCalendarEventIdServer(booking.id, result.eventId);
    }

    return NextResponse.json({ ok: true, eventId: result.eventId });
  } catch {
    return NextResponse.json({ error: 'Error syncing to Calendar' }, { status: 500 });
  }
}
