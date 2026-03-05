import { NextResponse } from 'next/server';
import {
  getAppointmentEventBySlugServer,
  getAvailableDatesForEventServer,
} from '@/lib/appointments/queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const event = await getAppointmentEventBySlugServer(slug);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const dates = await getAvailableDatesForEventServer(event.id);
    return NextResponse.json({ dates });
  } catch (err) {
    console.error('[appointments] Error fetching dates:', err);
    return NextResponse.json({ dates: [] });
  }
}
