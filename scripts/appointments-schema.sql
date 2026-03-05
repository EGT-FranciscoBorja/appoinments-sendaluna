-- Esquema D1 para la app de citas (apoinments)
-- Ejecutar: npm run db:schema (o ver README)

-- Eventos / tipos de cita (ej: "Consulta 15 min", "Reunión 30 min")
CREATE TABLE IF NOT EXISTS appointment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reservas / citas registradas por usuarios
CREATE TABLE IF NOT EXISTS appointment_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  notes TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES appointment_events(id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON appointment_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON appointment_bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_events_slug_active ON appointment_events(slug, is_active);
