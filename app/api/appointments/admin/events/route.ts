import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import {
  getAppointmentEventsForOwnerServer,
  createAppointmentEventServer,
} from '@/lib/appointments/queries';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const events = await getAppointmentEventsForOwnerServer(session.user.email);
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, title, description, duration_minutes, max_per_slot, notification_email, location_address, location_lat, location_lng, timezone } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const result = await createAppointmentEventServer({
      slug: slug ?? title.trim().toLowerCase().replace(/\s+/g, '-'),
      title: title.trim(),
      description: typeof description === 'string' ? description : undefined,
      duration_minutes:
        typeof duration_minutes === 'number' && duration_minutes > 0
          ? duration_minutes
          : 30,
      max_per_slot:
        typeof max_per_slot === 'number' && max_per_slot >= 1
          ? max_per_slot
          : undefined,
      notification_email:
        typeof notification_email === 'string' && notification_email.trim()
          ? notification_email.trim()
          : null,
      owner_email: session.user.email,
      location_address: typeof location_address === 'string' ? location_address : null,
      location_lat: typeof location_lat === 'number' ? location_lat : null,
      location_lng: typeof location_lng === 'number' ? location_lng : null,
      timezone: typeof timezone === 'string' && timezone.trim() ? timezone.trim() : null,
    });

    if (!result.ok) {
      if (result.reason === 'duplicate_slug') {
        return NextResponse.json(
          { error: 'An appointment type with this slug already exists. Choose another title or slug.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Could not create event' },
        { status: 400 }
      );
    }

    return NextResponse.json(result.event);
  } catch {
    return NextResponse.json({ error: 'Error creating event' }, { status: 500 });
  }
}
