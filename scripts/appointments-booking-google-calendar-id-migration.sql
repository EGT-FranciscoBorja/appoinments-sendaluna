-- Añade el ID del evento de Google Calendar a cada reserva (para poder borrarlo al eliminar la reserva)
-- Ejecutar: wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-booking-google-calendar-id-migration.sql

ALTER TABLE appointment_bookings ADD COLUMN google_calendar_event_id TEXT;
