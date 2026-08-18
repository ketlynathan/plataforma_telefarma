-- Fuso individual do usuário. Registros existentes permanecem no padrão atual.
ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- O horário da agenda pertence ao farmacêutico que oferece o slot.
ALTER TABLE "consultas"
  ADD COLUMN IF NOT EXISTS "agenda_timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS "agendado_em_utc" TIMESTAMPTZ(3);

-- Liga consultas antigas ao fuso salvo do farmacêutico quando houver vínculo.
UPDATE "consultas" c
SET "agenda_timezone" = u."timezone"
FROM "usuarios" u
WHERE c."farmaceutico_id" = u."id"
  AND u."timezone" IS NOT NULL
  AND u."timezone" <> '';

-- Backfill seguro: data/hora antigas são horário de parede no fuso da agenda.
UPDATE "consultas" c
SET "agendado_em_utc" = ((c."data"::date + c."hora"::time) AT TIME ZONE c."agenda_timezone")
WHERE c."agendado_em_utc" IS NULL;

CREATE INDEX IF NOT EXISTS "consultas_agendado_em_utc_idx"
  ON "consultas" ("agendado_em_utc");
