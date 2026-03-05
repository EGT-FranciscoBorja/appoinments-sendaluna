-- Guardar el ID del evento de Google Calendar al crear una reserva (para poder borrarlo después)
-- Ejecutar: wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-google-calendar-event-id-migration.sql

ALTER TABLE appointment_bookings ADD COLUMN google_calendar_event_id TEXT;
