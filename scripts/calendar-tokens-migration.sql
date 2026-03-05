-- Tokens de OAuth para sincronizar reservas con Google Calendar del administrador
-- Ejecutar: wrangler d1 execute apoinments-db --remote --file=./scripts/calendar-tokens-migration.sql

CREATE TABLE IF NOT EXISTS calendar_tokens (
  email TEXT NOT NULL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
