import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import {
  getAppointmentEventByIdServer,
  getEventAvailabilityServer,
  getEventAvailabilityDatesServer,
  setEventAvailabilityServer,
  setEventAvailabilityDatesServer,
} from '@/lib/appointments/queries';

function canEditEvent(ownerEmail: string | null, currentUserEmail: string): boolean {
  if (ownerEmail == null || ownerEmail === '') return true;
  return ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const event = await getAppointmentEventByIdServer(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!canEditEvent(event.owner_email, session.user.email)) {
      return NextResponse.json({ error: 'You can only view availability for your own events' }, { status: 403 });
    }
    const windows = await getEventAvailabilityServer(id);
    let specificDates: Awaited<ReturnType<typeof getEventAvailabilityDatesServer>> = [];
    try {
      specificDates = await getEventAvailabilityDatesServer(id);
    } catch {
      // Tabla event_availability_dates puede no existir si no se ejecutó la migración
    }
    return NextResponse.json({ windows, specificDates });
  } catch {
    return NextResponse.json({ error: 'Error fetching availability' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const event = await getAppointmentEventByIdServer(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!canEditEvent(event.owner_email, session.user.email)) {
      return NextResponse.json({ error: 'You can only edit availability for your own events' }, { status: 403 });
    }
    const body = await request.json();
    const windows = Array.isArray(body) ? (body as unknown[]) : body.windows;
    const specificDates = body.specificDates;
    if (!Array.isArray(windows)) {
      return NextResponse.json(
        { error: 'Expected body with windows (array) and optionally specificDates (array)' },
        { status: 400 }
      );
    }
    const valid = windows
      .filter(
        (w: unknown) =>
          w &&
          typeof w === 'object' &&
          typeof (w as { day_of_week?: number }).day_of_week === 'number' &&
          typeof (w as { start_time?: string }).start_time === 'string' &&
          typeof (w as { end_time?: string }).end_time === 'string'
      )
      .map((w: { day_of_week: number; start_time: string; end_time: string }) => ({
        day_of_week: w.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
      }));
    await setEventAvailabilityServer(id, valid);
    if (Array.isArray(specificDates)) {
      const validDates = specificDates
        .filter(
          (d: unknown) =>
            d &&
            typeof d === 'object' &&
            typeof (d as { availability_date?: string }).availability_date === 'string' &&
            typeof (d as { start_time?: string }).start_time === 'string' &&
            typeof (d as { end_time?: string }).end_time === 'string'
        )
        .map((d: { availability_date: string; start_time: string; end_time: string }) => ({
          availability_date: d.availability_date,
          start_time: d.start_time,
          end_time: d.end_time,
        }));
      try {
        await setEventAvailabilityDatesServer(id, validDates);
      } catch {
        // Tabla event_availability_dates puede no existir
      }
    }
    const updatedWindows = await getEventAvailabilityServer(id);
    let updatedDates: Awaited<ReturnType<typeof getEventAvailabilityDatesServer>> = [];
    try {
      updatedDates = await getEventAvailabilityDatesServer(id);
    } catch {
      // Tabla puede no existir
    }
    return NextResponse.json({ windows: updatedWindows, specificDates: updatedDates });
  } catch {
    return NextResponse.json({ error: 'Error saving availability' }, { status: 500 });
  }
}
