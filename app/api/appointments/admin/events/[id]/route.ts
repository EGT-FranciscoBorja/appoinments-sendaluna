import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import {
  getAppointmentEventByIdServer,
  updateAppointmentEventServer,
  deleteAppointmentEventServer,
} from '@/lib/appointments/queries';

function canEditEvent(ownerEmail: string | null, currentUserEmail: string): boolean {
  if (ownerEmail == null || ownerEmail === '') return true; // legacy: any admin can edit
  return ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
}

export async function PATCH(
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
      return NextResponse.json({ error: 'You can only edit your own events' }, { status: 403 });
    }

    const body = await request.json();
    const result = await updateAppointmentEventServer(id, {
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      description: body.description !== undefined ? (body.description === '' ? null : body.description) : undefined,
      duration_minutes: typeof body.duration_minutes === 'number' ? body.duration_minutes : undefined,
      max_per_slot: typeof body.max_per_slot === 'number' ? body.max_per_slot : undefined,
      notification_email: body.notification_email !== undefined ? (body.notification_email === '' ? null : body.notification_email) : undefined,
      location_address: body.location_address !== undefined ? (body.location_address === '' ? null : body.location_address) : undefined,
      location_lat: body.location_lat !== undefined ? (typeof body.location_lat === 'number' ? body.location_lat : null) : undefined,
      location_lng: body.location_lng !== undefined ? (typeof body.location_lng === 'number' ? body.location_lng : null) : undefined,
      timezone: body.timezone !== undefined ? (body.timezone === '' ? null : body.timezone) : undefined,
    });
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      if (result.reason === 'duplicate_slug') {
        return NextResponse.json(
          { error: 'Another event with this slug already exists. Choose another.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Error updating' }, { status: 400 });
    }
    return NextResponse.json(result.event);
  } catch {
    return NextResponse.json({ error: 'Error updating' }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: 'You can only delete your own events' }, { status: 403 });
    }

    const ok = await deleteAppointmentEventServer(id);
    if (!ok) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting' }, { status: 500 });
  }
}
