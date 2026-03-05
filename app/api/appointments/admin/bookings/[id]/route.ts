import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getBookingByIdServer,
  deleteBookingByIdServer,
  getAppointmentEventByIdServer,
} from '@/lib/appointments/queries';
import { deleteCalendarEvent } from '@/lib/google-calendar';

function canEditEvent(ownerEmail: string | null, currentUserEmail: string): boolean {
  if (ownerEmail == null || ownerEmail === '') return true;
  return ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
}

export async function DELETE(
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
      return NextResponse.json({ error: 'Forbidden: you can only delete bookings of your own events' }, { status: 403 });
    }

    if (booking.google_calendar_event_id && event.owner_email?.trim()) {
      const delResult = await deleteCalendarEvent(event.owner_email.trim(), booking.google_calendar_event_id);
      if (!delResult.ok) {
        console.warn('[Bookings] No se pudo eliminar el evento del calendario:', delResult.reason);
      }
    }

    const ok = await deleteBookingByIdServer(id);
    if (!ok) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting booking' }, { status: 500 });
  }
}
