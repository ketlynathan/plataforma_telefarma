-- Estados adicionais para espelhar o ciclo de atendimento das consultas agendadas.
ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'FARMACEUTICO_AGUARDANDO';
ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'EM_ATENDIMENTO';
ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'CONCLUIDA';
ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'FALHA_ATENDIMENTO';

-- Campos opcionais para não alterar nem invalidar emergências existentes.
ALTER TABLE "EmergencyRequest"
  ADD COLUMN IF NOT EXISTS "room_token" TEXT,
  ADD COLUMN IF NOT EXISTS "farmaceutico_entrou_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cliente_entrou_em" TIMESTAMP(3);
