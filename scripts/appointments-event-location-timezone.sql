-- Location and timezone for events. Run after main schema.
-- npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-event-location-timezone.sql

ALTER TABLE appointment_events ADD COLUMN location_address TEXT;
ALTER TABLE appointment_events ADD COLUMN location_lat REAL;
ALTER TABLE appointment_events ADD COLUMN location_lng REAL;
ALTER TABLE appointment_events ADD COLUMN timezone TEXT;
