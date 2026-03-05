import { NextRequest, NextResponse } from 'next/server';
import {
  getAppointmentEventBySlugServer,
  getBookingsByEventServer,
  getEventAvailabilityForDateServer,
} from '@/lib/appointments/queries';

function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}
function generateSlotsForDay(
  dateStr: string,
  durationMinutes: number,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const [y, mo, d] = dateStr.split('-').map(Number);
  const totalStart = startHour * 60 + startMin;
  const totalEnd = endHour * 60 + endMin;

  const step = Math.max(1, durationMinutes);
  for (let t = totalStart; t + durationMinutes <= totalEnd; t += step) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const endT = t + durationMinutes;
    const endH = Math.floor(endT / 60);
    const endM = endT % 60;
    const start = `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(m)}:00`;
    const end = `${y}-${pad(mo)}-${pad(d)} ${pad(endH)}:${pad(endM)}:00`;
    slots.push({ start, end });
  }
  return slots;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const event = await getAppointmentEventBySlugServer(slug);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Date parameter required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const windows = await getEventAvailabilityForDateServer(event.id, date);
    const allSlots: { start: string; end: string }[] = [];
    for (const w of windows) {
      allSlots.push(
        ...generateSlotsForDay(
          date,
          event.duration_minutes,
          w.startHour,
          w.startMin,
          w.endHour,
          w.endMin
        )
      );
    }
    allSlots.sort((a, b) => a.start.localeCompare(b.start));

    const fromDate = `${date} 00:00:00`;
    const toDate = `${date} 23:59:59`;
    const bookings = await getBookingsByEventServer(event.id);
    const dayBookings = bookings.filter(
      (b) => b.start_at >= fromDate && b.start_at <= toDate && b.status !== 'cancelled'
    );
    const maxPerSlot = event.max_per_slot ?? 1;

    const available = allSlots.filter((slot) => {
      const overlapping = dayBookings.filter(
        (b) =>
          (slot.start >= b.start_at && slot.start < b.end_at) ||
          (slot.end > b.start_at && slot.end <= b.end_at) ||
          (slot.start <= b.start_at && slot.end >= b.end_at)
      );
      return overlapping.length < maxPerSlot;
    });

    return NextResponse.json({
      event: { id: event.id, title: event.title, duration_minutes: event.duration_minutes },
      date,
      slots: available,
    });
  } catch {
    return NextResponse.json({ error: 'Error fetching slots' }, { status: 500 });
  }
}
