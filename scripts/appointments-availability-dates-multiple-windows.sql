-- Permite varios horarios por misma fecha (ej. 25/02/2026 de 09:00-10:00 y de 14:00-16:00).
-- Ejecutar después de appointments-availability-dates-migration.sql
-- npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-availability-dates-multiple-windows.sql

DROP TABLE IF EXISTS event_availability_dates_new;

-- Recrear tabla sin UNIQUE(event_id, availability_date) para permitir varias filas por fecha
CREATE TABLE event_availability_dates_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  availability_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  UNIQUE(event_id, availability_date, start_time, end_time),
  FOREIGN KEY (event_id) REFERENCES appointment_events(id)
);

-- Copiar datos si la tabla antigua existe (si no existe, no hacer nada; ejecutar antes la migración base)
INSERT OR IGNORE INTO event_availability_dates_new (id, event_id, availability_date, start_time, end_time)
SELECT id, event_id, availability_date, start_time, end_time FROM event_availability_dates;

DROP TABLE IF EXISTS event_availability_dates;

ALTER TABLE event_availability_dates_new RENAME TO event_availability_dates;

CREATE INDEX IF NOT EXISTS idx_event_availability_dates_event_id ON event_availability_dates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_availability_dates_date ON event_availability_dates(event_id, availability_date);
