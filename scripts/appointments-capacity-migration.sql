-- Capacidad por slot y número de asistentes por reserva
-- Ejecutar una vez: npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-capacity-migration.sql

-- Cuántas reservas pueden compartir el mismo horario (1 = una sola cita por slot, 10 = hasta 10 reservas en la misma franja)
ALTER TABLE appointment_events ADD COLUMN max_per_slot INTEGER DEFAULT 1;

-- Número de asistentes que indica quien hace la reserva (opcional, para información)
ALTER TABLE appointment_bookings ADD COLUMN number_of_attendees INTEGER DEFAULT 1;
