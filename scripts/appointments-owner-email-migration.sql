-- Owner (admin email) per event: only that admin can edit/delete the event.
-- Run once: npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-owner-email-migration.sql

ALTER TABLE appointment_events ADD COLUMN owner_email TEXT;

CREATE INDEX IF NOT EXISTS idx_appointment_events_owner_email ON appointment_events(owner_email);
