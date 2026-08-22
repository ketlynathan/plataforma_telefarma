-- Add product type to existing consultation records without changing any current row.
ALTER TABLE "consultas" ADD COLUMN "tipo_atendimento" TEXT;

-- CreateTable
CREATE TABLE "product_prices" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo_atendimento" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_por_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_holds" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "farmaceutico_id" TEXT NOT NULL,
    "product_price_id" TEXT NOT NULL,
    "paciente_nome" TEXT NOT NULL,
    "paciente_email" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "agenda_timezone" TEXT NOT NULL,
    "agendado_em_utc" TIMESTAMPTZ(3) NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMP(3) NOT NULL,
    "convertido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "product_price_id" TEXT NOT NULL,
    "booking_hold_id" TEXT,
    "consulta_id" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
    "external_payment_id" TEXT,
    "external_preference_id" TEXT,
    "amount_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "checkout_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "payload_hash" TEXT NOT NULL,
    "processado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_prices_slug_versao_key" ON "product_prices"("slug", "versao");
CREATE INDEX "product_prices_slug_ativo_idx" ON "product_prices"("slug", "ativo");
CREATE INDEX "booking_holds_farmaceutico_id_agendado_em_utc_status_idx" ON "booking_holds"("farmaceutico_id", "agendado_em_utc", "status");
CREATE INDEX "booking_holds_paciente_id_status_idx" ON "booking_holds"("paciente_id", "status");
CREATE INDEX "booking_holds_expira_em_status_idx" ON "booking_holds"("expira_em", "status");
CREATE UNIQUE INDEX "payments_booking_hold_id_key" ON "payments"("booking_hold_id");
CREATE UNIQUE INDEX "payments_provider_external_payment_id_key" ON "payments"("provider", "external_payment_id");
CREATE UNIQUE INDEX "payments_provider_external_preference_id_key" ON "payments"("provider", "external_preference_id");
CREATE INDEX "payments_paciente_id_status_idx" ON "payments"("paciente_id", "status");
CREATE INDEX "payments_consulta_id_idx" ON "payments"("consulta_id");
CREATE UNIQUE INDEX "payment_webhook_events_provider_event_id_key" ON "payment_webhook_events"("provider", "event_id");
CREATE INDEX "payment_webhook_events_payment_id_idx" ON "payment_webhook_events"("payment_id");

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "product_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "product_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_hold_id_fkey" FOREIGN KEY ("booking_hold_id") REFERENCES "booking_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Initial prices requested for the first launch. Future changes are made by creating a new version in the admin panel.
INSERT INTO "product_prices" ("id", "slug", "nome", "descricao", "tipo_atendimento", "valor_centavos", "versao", "ativo", "criado_em", "atualizado_em") VALUES
('10000000-0000-4000-8000-000000000001', 'consulta-simples', 'Consulta simples', 'Orientação farmacêutica individual.', 'SIMPLES', 3999, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('10000000-0000-4000-8000-000000000002', 'consulta-uso-continuo', 'Consulta de uso contínuo', 'Acompanhamento farmacoterapêutico e uso contínuo.', 'USO_CONTINUO', 5999, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('10000000-0000-4000-8000-000000000003', 'consulta-urgente', 'Consulta urgente', 'Atendimento farmacêutico agendado com prioridade.', 'URGENTE', 8999, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
