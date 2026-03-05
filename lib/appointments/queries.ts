import { APPOINTMENTS_D1_CONFIG, validateAppointmentsEnv } from './env';

export interface AppointmentEvent {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  max_per_slot: number;
  is_active: number;
  notification_email: string | null;
  owner_email: string | null; // admin who created the event; only they can edit/delete (null = legacy, any admin can)
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentBooking {
  id: number;
  event_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  notes: string | null;
  number_of_attendees: number | null;
  start_at: string;
  end_at: string;
  timezone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  google_calendar_event_id: string | null;
}

export interface BookingWithEvent extends AppointmentBooking {
  event_title: string;
  event_duration_minutes: number;
}

export interface EventAvailabilityWindow {
  day_of_week: number; // 0 = Domingo, 6 = Sábado
  start_time: string;  // "09:00"
  end_time: string;    // "18:00"
}

export interface EventAvailabilityDate {
  availability_date: string; // "2026-03-10" (YYYY-MM-DD)
  start_time: string;
  end_time: string;
}

/** Normalizes a date string to YYYY-MM-DD (for DB and comparisons). Accepts YYYY-MM-DD or DD/MM/YYYY. */
function normalizeDateToYYYYMMDD(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

async function queryAppointmentsD1(
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown>[]> {
  try {
    validateAppointmentsEnv();
  } catch {
    return [];
  }

  const { databaseId, apiToken, accountId } = APPOINTMENTS_D1_CONFIG;
  if (!databaseId || !apiToken || !accountId) return [];

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`D1 error: ${response.status}`);

    const data = (await response.json()) as { result?: { results?: Record<string, unknown>[] }[] };
    return data.result?.[0]?.results ?? [];
  } catch {
    return [];
  }
}

function rowToEvent(row: Record<string, unknown>): AppointmentEvent {
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    duration_minutes: (row.duration_minutes as number) ?? 30,
    max_per_slot: (row.max_per_slot as number) ?? 1,
    is_active: (row.is_active as number) ?? 1,
    notification_email: (row.notification_email as string) ?? null,
    owner_email: (row.owner_email as string) ?? null,
    location_address: (row.location_address as string) ?? null,
    location_lat: row.location_lat != null ? Number(row.location_lat) : null,
    location_lng: row.location_lng != null ? Number(row.location_lng) : null,
    timezone: (row.timezone as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToBooking(row: Record<string, unknown>): AppointmentBooking {
  return {
    id: row.id as number,
    event_id: row.event_id as number,
    guest_name: row.guest_name as string,
    guest_email: row.guest_email as string,
    guest_phone: (row.guest_phone as string) ?? null,
    notes: (row.notes as string) ?? null,
    number_of_attendees: row.number_of_attendees != null ? Number(row.number_of_attendees) : null,
    start_at: row.start_at as string,
    end_at: row.end_at as string,
    timezone: (row.timezone as string) ?? null,
    status: (row.status as string) ?? 'confirmed',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    google_calendar_event_id: (row.google_calendar_event_id as string) ?? null,
  };
}

// --- Eventos ---

export async function getAppointmentEventsServer(activeOnly = true): Promise<AppointmentEvent[]> {
  const sql = activeOnly
    ? 'SELECT * FROM appointment_events WHERE is_active = 1 ORDER BY title'
    : 'SELECT * FROM appointment_events ORDER BY title';
  const rows = await queryAppointmentsD1(sql);
  return rows.map(rowToEvent);
}

/** Events visible to an admin: own events + legacy events (owner_email IS NULL). */
export async function getAppointmentEventsForOwnerServer(ownerEmail: string): Promise<AppointmentEvent[]> {
  const rows = await queryAppointmentsD1(
    `SELECT * FROM appointment_events WHERE is_active = 1 AND (owner_email IS NULL OR owner_email = ?) ORDER BY title`,
    [ownerEmail.toLowerCase()]
  );
  return rows.map(rowToEvent);
}

export async function getAppointmentEventBySlugServer(slug: string): Promise<AppointmentEvent | null> {
  const rows = await queryAppointmentsD1(
    'SELECT * FROM appointment_events WHERE slug = ? AND is_active = 1 LIMIT 1',
    [slug]
  );
  if (rows.length === 0) return null;
  return rowToEvent(rows[0]);
}

export async function getAppointmentEventByIdServer(id: number): Promise<AppointmentEvent | null> {
  const rows = await queryAppointmentsD1('SELECT * FROM appointment_events WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return null;
  return rowToEvent(rows[0]);
}

export type CreateEventResult =
  | { ok: true; event: AppointmentEvent }
  | { ok: false; reason: 'duplicate_slug' };

export async function createAppointmentEventServer(params: {
  slug: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  max_per_slot?: number;
  notification_email?: string | null;
  owner_email?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  timezone?: string | null;
}): Promise<CreateEventResult> {
  const slug = params.slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const duration = params.duration_minutes ?? 30;
  const maxPerSlot = Math.max(1, params.max_per_slot ?? 1);
  const ownerEmail = params.owner_email?.trim() || null;
  const locationAddress = params.location_address?.trim() || null;
  const locationLat = params.location_lat ?? null;
  const locationLng = params.location_lng ?? null;
  const timezone = params.timezone?.trim() || null;

  const existingActive = await queryAppointmentsD1(
    'SELECT id FROM appointment_events WHERE slug = ? AND is_active = 1 LIMIT 1',
    [slug]
  );
  if (existingActive.length > 0) {
    return { ok: false, reason: 'duplicate_slug' };
  }

  // If there is an inactive (deleted) event with this slug, remove it so we can reuse the slug
  const existingInactive = await queryAppointmentsD1(
    'SELECT id FROM appointment_events WHERE slug = ? AND is_active = 0 LIMIT 1',
    [slug]
  );
  if (existingInactive.length > 0) {
    const oldId = existingInactive[0].id as number;
    await queryAppointmentsD1('DELETE FROM appointment_bookings WHERE event_id = ?', [oldId]);
    await queryAppointmentsD1('DELETE FROM event_availability_dates WHERE event_id = ?', [oldId]);
    await queryAppointmentsD1('DELETE FROM event_availability WHERE event_id = ?', [oldId]);
    await queryAppointmentsD1('DELETE FROM appointment_events WHERE id = ?', [oldId]);
  }

  await queryAppointmentsD1(
    `INSERT INTO appointment_events (slug, title, description, duration_minutes, max_per_slot, notification_email, owner_email, location_address, location_lat, location_lng, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, params.title, params.description ?? null, duration, maxPerSlot, params.notification_email ?? null, ownerEmail, locationAddress, locationLat, locationLng, timezone]
  );
  const event = await getAppointmentEventBySlugServer(slug);
  if (!event) {
    return { ok: false, reason: 'duplicate_slug' };
  }
  return { ok: true, event };
}

export type UpdateEventResult =
  | { ok: true; event: AppointmentEvent }
  | { ok: false; reason: 'not_found' | 'duplicate_slug' };

export async function updateAppointmentEventServer(
  id: number,
  params: {
    title?: string;
    slug?: string;
    description?: string | null;
    duration_minutes?: number;
    max_per_slot?: number;
    notification_email?: string | null;
    location_address?: string | null;
    location_lat?: number | null;
    location_lng?: number | null;
    timezone?: string | null;
  }
): Promise<UpdateEventResult> {
  const existing = await getAppointmentEventByIdServer(id);
  if (!existing) return { ok: false, reason: 'not_found' };

  const slug = params.slug != null
    ? String(params.slug).replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    : existing.slug;
  const title = params.title?.trim() ?? existing.title;
  const description = params.description !== undefined ? params.description : existing.description;
  const duration_minutes = params.duration_minutes ?? existing.duration_minutes;
  const max_per_slot = params.max_per_slot != null ? Math.max(1, params.max_per_slot) : existing.max_per_slot;
  const notification_email = params.notification_email !== undefined ? params.notification_email : existing.notification_email;
  const location_address = params.location_address !== undefined ? (params.location_address?.trim() || null) : existing.location_address;
  const location_lat = params.location_lat !== undefined ? params.location_lat : existing.location_lat;
  const location_lng = params.location_lng !== undefined ? params.location_lng : existing.location_lng;
  const timezone = params.timezone !== undefined ? (params.timezone?.trim() || null) : existing.timezone;

  if (slug !== existing.slug) {
    const other = await queryAppointmentsD1(
      'SELECT id FROM appointment_events WHERE slug = ? AND id != ? AND is_active = 1 LIMIT 1',
      [slug, id]
    );
    if (other.length > 0) return { ok: false, reason: 'duplicate_slug' };
  }

  await queryAppointmentsD1(
    `UPDATE appointment_events SET slug = ?, title = ?, description = ?, duration_minutes = ?, max_per_slot = ?, notification_email = ?, location_address = ?, location_lat = ?, location_lng = ?, timezone = ?, updated_at = datetime('now') WHERE id = ?`,
    [slug, title, description, duration_minutes, max_per_slot, notification_email, location_address, location_lat, location_lng, timezone, id]
  );
  const updated = await getAppointmentEventByIdServer(id);
  return updated ? { ok: true, event: updated } : { ok: false, reason: 'not_found' };
}

export async function deleteAppointmentEventServer(id: number): Promise<boolean> {
  const existing = await getAppointmentEventByIdServer(id);
  if (!existing) return false;
  await queryAppointmentsD1(
    `UPDATE appointment_events SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
  return true;
}

// --- Disponibilidad (fechas y horarios por evento) ---

export async function getEventAvailabilityServer(
  eventId: number
): Promise<EventAvailabilityWindow[]> {
  const rows = await queryAppointmentsD1(
    'SELECT day_of_week, start_time, end_time FROM event_availability WHERE event_id = ? ORDER BY day_of_week',
    [eventId]
  );
  return rows.map((r) => ({
    day_of_week: r.day_of_week as number,
    start_time: r.start_time as string,
    end_time: r.end_time as string,
  }));
}

export async function setEventAvailabilityServer(
  eventId: number,
  windows: EventAvailabilityWindow[]
): Promise<void> {
  await queryAppointmentsD1('DELETE FROM event_availability WHERE event_id = ?', [eventId]);
  for (const w of windows) {
    if (!w.start_time || !w.end_time) continue;
    await queryAppointmentsD1(
      'INSERT INTO event_availability (event_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
      [eventId, w.day_of_week, w.start_time, w.end_time]
    );
  }
}

// --- Disponibilidad por fechas concretas ---

export async function getEventAvailabilityDatesServer(
  eventId: number
): Promise<EventAvailabilityDate[]> {
  const rows = await queryAppointmentsD1(
    'SELECT availability_date, start_time, end_time FROM event_availability_dates WHERE event_id = ? ORDER BY availability_date',
    [eventId]
  );
  return rows.map((r) => ({
    availability_date: r.availability_date as string,
    start_time: r.start_time as string,
    end_time: r.end_time as string,
  }));
}

export async function setEventAvailabilityDatesServer(
  eventId: number,
  dates: EventAvailabilityDate[]
): Promise<void> {
  await queryAppointmentsD1('DELETE FROM event_availability_dates WHERE event_id = ?', [eventId]);
  for (const d of dates) {
    const dateStr = normalizeDateToYYYYMMDD(d.availability_date);
    if (!dateStr || !d.start_time || !d.end_time) continue;
    await queryAppointmentsD1(
      'INSERT INTO event_availability_dates (event_id, availability_date, start_time, end_time) VALUES (?, ?, ?, ?)',
      [eventId, dateStr, d.start_time, d.end_time]
    );
  }
}

export interface AvailabilityWindow {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

/** Para una fecha YYYY-MM-DD devuelve una o varias ventanas de horario. Prioridad: 1) event_availability_dates para esa fecha (todas las filas), 2) event_availability por día de la semana. Si no hay nada, default 9–18. */
export async function getEventAvailabilityForDateServer(
  eventId: number,
  dateStr: string
): Promise<AvailabilityWindow[]> {
  const spec = await queryAppointmentsD1(
    'SELECT start_time, end_time FROM event_availability_dates WHERE event_id = ? AND availability_date = ? ORDER BY start_time',
    [eventId, dateStr]
  );
  if (spec.length > 0) {
    return spec.map((row) => {
      const start = ((row.start_time as string) || '09:00').split(':').map(Number);
      const end = ((row.end_time as string) || '18:00').split(':').map(Number);
      return {
        startHour: start[0] ?? 9,
        startMin: start[1] ?? 0,
        endHour: end[0] ?? 18,
        endMin: end[1] ?? 0,
      };
    });
  }
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const anyRows = await queryAppointmentsD1(
    'SELECT 1 FROM event_availability WHERE event_id = ? LIMIT 1',
    [eventId]
  );
  const rowForDay = await queryAppointmentsD1(
    'SELECT start_time, end_time FROM event_availability WHERE event_id = ? AND day_of_week = ? LIMIT 1',
    [eventId, dayOfWeek]
  );
  if (anyRows.length === 0) {
    return [{ startHour: 9, startMin: 0, endHour: 18, endMin: 0 }];
  }
  if (rowForDay.length === 0) {
    return [{ startHour: 18, startMin: 0, endHour: 18, endMin: 0 }];
  }
  const start = (rowForDay[0].start_time as string).split(':').map(Number);
  const end = (rowForDay[0].end_time as string).split(':').map(Number);
  return [
    {
      startHour: start[0] ?? 9,
      startMin: start[1] ?? 0,
      endHour: end[0] ?? 18,
      endMin: end[1] ?? 0,
    },
  ];
}

/** Returns list of dates (YYYY-MM-DD) when the event can be booked: specific dates from event_availability_dates (>= today) plus dates from weekly schedule (next 90 days). */
export async function getAvailableDatesForEventServer(eventId: number): Promise<string[]> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const specificRows = await queryAppointmentsD1(
    'SELECT availability_date FROM event_availability_dates WHERE event_id = ? ORDER BY availability_date',
    [eventId]
  );
  const specificDates = new Set<string>();
  for (const r of specificRows) {
    const raw = (r.availability_date as string) || '';
    const normalized = normalizeDateToYYYYMMDD(raw);
    if (normalized && normalized >= todayStr) specificDates.add(normalized);
  }

  const weekRows = await queryAppointmentsD1(
    'SELECT day_of_week FROM event_availability WHERE event_id = ?',
    [eventId]
  );
  const availableDaysOfWeek = new Set(weekRows.map((r) => r.day_of_week as number));

  const dates: string[] = [...specificDates];
  if (availableDaysOfWeek.size > 0) {
    const end = new Date(today);
    end.setDate(end.getDate() + 90);
    const d = new Date(today);
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      if (!specificDates.has(dateStr) && availableDaysOfWeek.has(d.getDay())) {
        dates.push(dateStr);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  dates.sort();
  return dates;
}

// --- Reservas ---

export async function getBookingsByEventServer(
  eventId: number,
  fromDate?: string
): Promise<AppointmentBooking[]> {
  let sql = 'SELECT * FROM appointment_bookings WHERE event_id = ?';
  const params: unknown[] = [eventId];
  if (fromDate) {
    sql += ' AND start_at >= ?';
    params.push(fromDate);
  }
  sql += ' ORDER BY start_at ASC';
  const rows = await queryAppointmentsD1(sql, params);
  return rows.map(rowToBooking);
}

export async function getBookingByIdServer(id: number): Promise<AppointmentBooking | null> {
  const rows = await queryAppointmentsD1('SELECT * FROM appointment_bookings WHERE id = ? LIMIT 1', [id]);
  return rows.length > 0 ? rowToBooking(rows[0]) : null;
}

export async function deleteBookingByIdServer(id: number): Promise<boolean> {
  const existing = await getBookingByIdServer(id);
  if (!existing) return false;
  await queryAppointmentsD1('DELETE FROM appointment_bookings WHERE id = ?', [id]);
  return true;
}

export async function getBookingsForSlotServer(
  eventId: number,
  startAt: string,
  endAt: string
): Promise<AppointmentBooking[]> {
  const rows = await queryAppointmentsD1(
    `SELECT * FROM appointment_bookings 
     WHERE event_id = ? AND status != 'cancelled' 
     AND ((start_at < ? AND end_at > ?) OR (start_at >= ? AND start_at < ?))`,
    [eventId, endAt, startAt, startAt, endAt]
  );
  return rows.map(rowToBooking);
}

export async function createBookingServer(params: {
  event_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  notes?: string;
  number_of_attendees?: number | null;
  start_at: string;
  end_at: string;
  timezone?: string;
}): Promise<AppointmentBooking | null> {
  const event = await getAppointmentEventByIdServer(params.event_id);
  const maxPerSlot = event?.max_per_slot ?? 1;

  const existing = await getBookingsForSlotServer(
    params.event_id,
    params.start_at,
    params.end_at
  );
  if (existing.length >= maxPerSlot) {
    return null; // slot al completo
  }

  const attendees = params.number_of_attendees != null && params.number_of_attendees >= 1
    ? params.number_of_attendees
    : null;

  await queryAppointmentsD1(
    `INSERT INTO appointment_bookings 
     (event_id, guest_name, guest_email, guest_phone, notes, number_of_attendees, start_at, end_at, timezone, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [
      params.event_id,
      params.guest_name,
      params.guest_email,
      params.guest_phone ?? null,
      params.notes ?? null,
      attendees,
      params.start_at,
      params.end_at,
      params.timezone ?? null,
    ]
  );

  const rows = await queryAppointmentsD1(
    'SELECT * FROM appointment_bookings WHERE event_id = ? AND start_at = ? ORDER BY id DESC LIMIT 1',
    [params.event_id, params.start_at]
  );
  return rows.length > 0 ? rowToBooking(rows[0]) : null;
}

export async function getAllBookingsServer(fromDate?: string): Promise<BookingWithEvent[]> {
  let sql = `
    SELECT b.*, e.title as event_title, e.duration_minutes as event_duration_minutes
    FROM appointment_bookings b
    JOIN appointment_events e ON e.id = b.event_id
  `;
  const params: unknown[] = [];
  if (fromDate) {
    sql += ' WHERE b.start_at >= ?';
    params.push(fromDate);
  }
  sql += ' ORDER BY b.start_at DESC';
  const rows = await queryAppointmentsD1(sql, params);
  return rows.map((r) => ({
    ...rowToBooking(r),
    event_title: r.event_title as string,
    event_duration_minutes: r.event_duration_minutes as number,
  }));
}

/** Reservas solo de eventos que pertenecen al admin (owner_email = ownerEmail o legacy sin owner). */
export async function getBookingsForOwnerServer(
  ownerEmail: string,
  fromDate?: string
): Promise<BookingWithEvent[]> {
  const email = ownerEmail.trim().toLowerCase();
  let sql = `
    SELECT b.*, e.title as event_title, e.duration_minutes as event_duration_minutes
    FROM appointment_bookings b
    JOIN appointment_events e ON e.id = b.event_id
    WHERE (e.owner_email IS NULL OR LOWER(TRIM(e.owner_email)) = ?)
  `;
  const params: unknown[] = [email];
  if (fromDate) {
    sql += ' AND b.start_at >= ?';
    params.push(fromDate);
  }
  sql += ' ORDER BY b.start_at DESC';
  const rows = await queryAppointmentsD1(sql, params);
  return rows.map((r) => ({
    ...rowToBooking(r),
    event_title: r.event_title as string,
    event_duration_minutes: r.event_duration_minutes as number,
  }));
}

export async function updateBookingCalendarEventIdServer(
  bookingId: number,
  googleCalendarEventId: string
): Promise<void> {
  await queryAppointmentsD1(
    'UPDATE appointment_bookings SET google_calendar_event_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [googleCalendarEventId, bookingId]
  );
}

// --- Tokens Google Calendar (admin que inició sesión) ---

export interface CalendarTokensRow {
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getCalendarTokensServer(email: string): Promise<CalendarTokensRow | null> {
  const rows = await queryAppointmentsD1(
    'SELECT email, access_token, refresh_token, expires_at FROM calendar_tokens WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    email: r.email as string,
    access_token: r.access_token as string,
    refresh_token: r.refresh_token as string,
    expires_at: Number(r.expires_at),
  };
}

export async function insertOrUpdateCalendarTokensServer(params: {
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}): Promise<void> {
  const email = params.email.trim().toLowerCase();
  await queryAppointmentsD1(
    `INSERT INTO calendar_tokens (email, access_token, refresh_token, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at`,
    [email, params.access_token, params.refresh_token, params.expires_at]
  );
}

/** Delete calendar_tokens whose refresh_token starts with the given prefix (e.g. for RISC token-revoked). */
export async function deleteCalendarTokensByRefreshTokenPrefix(prefix: string): Promise<void> {
  if (!prefix || prefix.length > 512) return;
  await queryAppointmentsD1(
    'DELETE FROM calendar_tokens WHERE refresh_token LIKE ?',
    [`${prefix}%`]
  );
}
