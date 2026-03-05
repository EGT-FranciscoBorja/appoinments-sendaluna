-- Migración: horarios disponibles por evento y día de la semana
-- Ejecutar una vez: npm run db:migrate-availability (o npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-availability-migration.sql)
-- day_of_week: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado. start_time/end_time en formato HH:MM (24h)

CREATE TABLE IF NOT EXISTS event_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  UNIQUE(event_id, day_of_week),
  FOREIGN KEY (event_id) REFERENCES appointment_events(id)
);

CREATE INDEX IF NOT EXISTS idx_event_availability_event_id ON event_availability(event_id);
