-- Migración: fechas concretas de disponibilidad (además de día de la semana)
-- Sin esta tabla, las "Specific dates" del admin no se guardan y en la página de reserva saldrá "No dates available".
-- Ejecutar una vez: npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-availability-dates-migration.sql
-- availability_date: YYYY-MM-DD. start_time/end_time: HH:MM (24h)

CREATE TABLE IF NOT EXISTS event_availability_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  availability_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  UNIQUE(event_id, availability_date),
  FOREIGN KEY (event_id) REFERENCES appointment_events(id)
);

CREATE INDEX IF NOT EXISTS idx_event_availability_dates_event_id ON event_availability_dates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_availability_dates_date ON event_availability_dates(event_id, availability_date);
