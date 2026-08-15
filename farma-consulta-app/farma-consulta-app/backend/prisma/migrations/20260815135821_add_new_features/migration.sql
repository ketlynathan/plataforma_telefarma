-- Criação dos enums usados pelas novas colunas.
CREATE TYPE "ConsultaStatus" AS ENUM ('AGENDADA', 'CONFIRMADA', 'CLIENTE_AGUARDANDO', 'FARMACEUTICO_AGUARDANDO', 'EM_ATENDIMENTO', 'CONCLUIDA', 'CLIENTE_AUSENTE', 'FARMACEUTICO_AUSENTE', 'CANCELADA', 'REAGENDADA');
CREATE TYPE "EmergencyStatus" AS ENUM ('EM_ABERTO', 'ATENDIDA', 'EXPIRADA', 'CANCELADA', 'ENCERRADA');

-- Normalização de dados: mapeia os valores string existentes da coluna status
-- para o enum antes de a coluna ser recriada. Sem isto, haveria perda de linhas.
ALTER TABLE "consultas" RENAME COLUMN "status" TO "_status_old";
UPDATE "consultas"
SET "_status_old" = CASE
    WHEN "_status_old" = 'Agendada' THEN 'AGENDADA'
    WHEN "_status_old" = 'Confirmada' THEN 'CONFIRMADA'
    WHEN "_status_old" = 'Em atendimento' THEN 'EM_ATENDIMENTO'
    WHEN "_status_old" = 'Concluida' OR "_status_old" = 'Concluída' THEN 'CONCLUIDA'
    WHEN "_status_old" = 'Cancelada' THEN 'CANCELADA'
    WHEN "_status_old" = 'Reagendada' THEN 'REAGENDADA'
    WHEN "_status_old" = 'Cliente aguardando' THEN 'CLIENTE_AGUARDANDO'
    WHEN "_status_old" = 'Farmaceutico aguardando' THEN 'FARMACEUTICO_AGUARDANDO'
    WHEN "_status_old" = 'Cliente ausente' THEN 'CLIENTE_AUSENTE'
    WHEN "_status_old" = 'Farmaceutico ausente' THEN 'FARMACEUTICO_AUSENTE'
    ELSE 'AGENDADA'
  END;
ALTER TABLE "consultas" DROP COLUMN "_status_old";

-- Alteração aditiva na tabela usuarios (novas colunas com defaults, seguro em produção).
ALTER TABLE "usuarios" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "convidado_por" TEXT,
ADD COLUMN     "disponivel_emergencia" BOOLEAN NOT NULL DEFAULT false;

-- Alteração aditiva na tabela consultas (FK opcional + sala persistida; status recriado como enum).
ALTER TABLE "consultas" ADD COLUMN     "farmaceutico_id" TEXT,
ADD COLUMN     "room_slug" TEXT,
ADD COLUMN     "room_token" TEXT,
ADD COLUMN     "status" "ConsultaStatus" NOT NULL DEFAULT 'AGENDADA';

-- Novas tabelas (adições puras, sem impacto em código existente).
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "farmaceutico_id" TEXT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fim" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_blockouts" (
    "id" TEXT NOT NULL,
    "farmaceutico_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "AvailabilityBlockout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criado_por" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "remetente_id" TEXT NOT NULL,
    "destinatario_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmergencyRequest" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "farmaceutico_id" TEXT,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'EM_ABERTO',
    "room_slug" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aceito_em" TIMESTAMP(3),
    "iniciado_em" TIMESTAMP(3),
    "encerrado_em" TIMESTAMP(3),
    "motivo_encerramento" TEXT,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "Availability_farmaceutico_id_idx" ON "Availability"("farmaceutico_id");
CREATE UNIQUE INDEX "Availability_farmaceutico_id_dia_semana_hora_inicio_key" ON "Availability"("farmaceutico_id", "dia_semana", "hora_inicio");
CREATE INDEX "AvailabilityBlockout_farmaceutico_id_idx" ON "AvailabilityBlockout"("farmaceutico_id");
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");
CREATE INDEX "Message_consulta_id_idx" ON "Message"("consulta_id");
CREATE INDEX "EmergencyRequest_cliente_id_idx" ON "EmergencyRequest"("cliente_id");
CREATE INDEX "EmergencyRequest_status_idx" ON "EmergencyRequest"("status");
CREATE INDEX "consultas_farmaceutico_id_idx" ON "consultas"("farmaceutico_id");

-- Chaves estrangeiras
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AvailabilityBlockout" ADD CONSTRAINT "AvailabilityBlockout_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_remetente_id_fkey" FOREIGN KEY ("remetente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
