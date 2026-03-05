import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBookingsForOwnerServer } from '@/lib/appointments/queries';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');

    const bookings = await getBookingsForOwnerServer(token.email as string, from ?? undefined);
    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }
}
