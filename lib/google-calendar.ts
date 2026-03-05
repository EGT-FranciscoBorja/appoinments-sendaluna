/**
 * Sincronización con Google Calendar del administrador del evento.
 * Cuando se confirma una reserva, se crea un evento en el calendario de quien creó el evento (owner_email).
 */

import {
  getCalendarTokensServer,
  insertOrUpdateCalendarTokensServer,
} from '@/lib/appointments/queries';
import type { AppointmentBooking } from '@/lib/appointments/queries';
import type { AppointmentEvent } from '@/lib/appointments/queries';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/** Refresca el access_token usando refresh_token y actualiza la BD. */
async function refreshAndStoreAccessToken(
  email: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  const accessToken = data.access_token;
  const expiresIn = data.expires_in ?? 3600;
  if (!accessToken) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  await insertOrUpdateCalendarTokensServer({
    email,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
  });
  return accessToken;
}

/** Devuelve un access_token válido para el email (refrescando si hace falta). */
export async function getValidCalendarAccessToken(email: string): Promise<string | null> {
  const row = await getCalendarTokensServer(email);
  if (!row) return null;

  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // refrescar 1 min antes de caducar
  if (row.expires_at > now + buffer) {
    return row.access_token;
  }

  return refreshAndStoreAccessToken(email, row.refresh_token);
}

/** Formato ISO para la API de Calendar (con timezone si lo tenemos). */
function toCalendarDateTime(
  localDatetime: string,
  timezone?: string | null
): { dateTime: string; timeZone?: string } {
  // localDatetime suele ser "YYYY-MM-DD HH:mm:ss"
  const normalized = String(localDatetime).replace(' ', 'T').slice(0, 19);
  const dateTime = normalized.includes('T') ? `${normalized}` : `${normalized}T00:00:00`;
  const out: { dateTime: string; timeZone?: string } = { dateTime };
  if (timezone?.trim()) {
    out.timeZone = timezone.trim();
  }
  return out;
}

/**
 * Crea un evento en el Google Calendar del administrador (owner del evento).
 * Se llama después de crear la reserva en la BD.
 */
export async function createCalendarEventForBooking(
  ownerEmail: string,
  event: AppointmentEvent,
  booking: AppointmentBooking
): Promise<{ ok: true; eventId?: string } | { ok: false; reason: string }> {
  const accessToken = await getValidCalendarAccessToken(ownerEmail);
  if (!accessToken) {
    return { ok: false, reason: 'no_calendar_tokens' };
  }

  const summary = `${event.title} – ${booking.guest_name}`;
  const descriptionParts = [
    `Invitado: ${booking.guest_name}`,
    `Email: ${booking.guest_email}`,
    booking.guest_phone ? `Tel: ${booking.guest_phone}` : null,
    booking.notes ? `Notas: ${booking.notes}` : null,
  ].filter(Boolean);
  const description = descriptionParts.join('\n');

  // Use event timezone so the event is stored as "at this time in the event's location".
  // Google Calendar then shows it in the viewer's local time (e.g. 09:00 Berlin → 03:00 in Ecuador).
  const eventTz = event.timezone?.trim() || undefined;
  const body = {
    summary,
    description,
    location: event.location_address ?? undefined,
    start: toCalendarDateTime(booking.start_at, eventTz),
    end: toCalendarDateTime(booking.end_at, eventTz),
  };

  const res = await fetch(GOOGLE_CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, reason: `calendar_api: ${res.status} ${errText.slice(0, 200)}` };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, eventId: data.id };
}

/**
 * Elimina un evento del Google Calendar del administrador.
 * Se llama al borrar una reserva en el panel admin.
 */
export async function deleteCalendarEvent(
  ownerEmail: string,
  eventId: string
): Promise<{ ok: boolean; reason?: string }> {
  const accessToken = await getValidCalendarAccessToken(ownerEmail);
  if (!accessToken) {
    return { ok: false, reason: 'no_calendar_tokens' };
  }

  const url = `${GOOGLE_CALENDAR_API}/${encodeURIComponent(eventId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    return { ok: false, reason: `calendar_api: ${res.status} ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}
