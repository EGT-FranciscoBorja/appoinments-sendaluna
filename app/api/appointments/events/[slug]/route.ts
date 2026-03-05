import { NextRequest, NextResponse } from 'next/server';
import { getAppointmentEventBySlugServer } from '@/lib/appointments/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const event = await getAppointmentEventBySlugServer(slug);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: 'Error fetching event' }, { status: 500 });
  }
}
