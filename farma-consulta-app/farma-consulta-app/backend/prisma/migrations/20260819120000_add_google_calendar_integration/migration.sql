-- Integração opcional com o Google Calendar.
-- Tokens ficam somente no backend; nenhum segredo é exposto pela API de perfil.
ALTER TABLE "consultas"
  ADD COLUMN IF NOT EXISTS "google_calendar_id" TEXT,
  ADD COLUMN IF NOT EXISTS "google_event_id" TEXT;

CREATE INDEX IF NOT EXISTS "consultas_google_event_id_idx"
  ON "consultas" ("google_event_id");

CREATE TABLE IF NOT EXISTS "google_calendar_connections" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "scope" TEXT,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_connections_user_id_key"
  ON "google_calendar_connections" ("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'google_calendar_connections_user_id_fkey'
  ) THEN
    ALTER TABLE "google_calendar_connections"
      ADD CONSTRAINT "google_calendar_connections_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "usuarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
