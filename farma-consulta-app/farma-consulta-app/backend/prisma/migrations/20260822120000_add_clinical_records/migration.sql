-- CreateTable
CREATE TABLE "prontuarios" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "ultimo_atendimento_em" TIMESTAMP(3),

    CONSTRAINT "prontuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prontuario_entradas" (
    "id" TEXT NOT NULL,
    "prontuario_id" TEXT NOT NULL,
    "consulta_id" TEXT,
    "farmaceutico_id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'EVOLUCAO',
    "conteudo" TEXT NOT NULL,
    "conduta" TEXT,
    "orientacoes" TEXT,
    "encaminhamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "finalizado_em" TIMESTAMP(3),

    CONSTRAINT "prontuario_entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolos_atendimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolos_atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolos_versoes" (
    "id" TEXT NOT NULL,
    "protocolo_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "campos_json" JSONB NOT NULL,
    "publicado_em" TIMESTAMP(3),
    "publicado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocolos_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimentos" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "versao_documento" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "aceito" BOOLEAN NOT NULL,
    "aceito_em" TIMESTAMP(3),
    "revogado_em" TIMESTAMP(3),
    "evidencia_json" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_clinicos" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "consulta_id" TEXT,
    "entrada_id" TEXT,
    "nome_original" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "checksum" TEXT,
    "criado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_clinicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescricoes_farmaceuticas" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "farmaceutico_id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "pdf_key" TEXT,
    "carimbo_nome" TEXT NOT NULL,
    "carimbo_crf" TEXT NOT NULL,
    "carimbo_data_hora" TIMESTAMP(3) NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescricoes_farmaceuticas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_auditoria" (
    "id" TEXT NOT NULL,
    "ator_id" TEXT,
    "alvo_tipo" TEXT NOT NULL,
    "alvo_id" TEXT,
    "acao" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "metadados_json" JSONB,

    CONSTRAINT "eventos_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "farmaceutico_id" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "consulta_id" TEXT,
    "concedido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMP(3),
    "revogado_em" TIMESTAMP(3),

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prontuarios_paciente_id_key" ON "prontuarios"("paciente_id");
CREATE INDEX "prontuario_entradas_prontuario_id_criado_em_idx" ON "prontuario_entradas"("prontuario_id", "criado_em");
CREATE INDEX "prontuario_entradas_consulta_id_idx" ON "prontuario_entradas"("consulta_id");
CREATE INDEX "prontuario_entradas_farmaceutico_id_idx" ON "prontuario_entradas"("farmaceutico_id");
CREATE INDEX "protocolos_atendimento_ativo_idx" ON "protocolos_atendimento"("ativo");
CREATE UNIQUE INDEX "protocolos_versoes_protocolo_id_versao_key" ON "protocolos_versoes"("protocolo_id", "versao");
CREATE INDEX "consentimentos_paciente_id_tipo_criado_em_idx" ON "consentimentos"("paciente_id", "tipo", "criado_em");
CREATE UNIQUE INDEX "anexos_clinicos_storage_key_key" ON "anexos_clinicos"("storage_key");
CREATE INDEX "anexos_clinicos_paciente_id_criado_em_idx" ON "anexos_clinicos"("paciente_id", "criado_em");
CREATE INDEX "anexos_clinicos_consulta_id_idx" ON "anexos_clinicos"("consulta_id");
CREATE INDEX "anexos_clinicos_entrada_id_idx" ON "anexos_clinicos"("entrada_id");
CREATE INDEX "prescricoes_farmaceuticas_consulta_id_versao_idx" ON "prescricoes_farmaceuticas"("consulta_id", "versao");
CREATE INDEX "prescricoes_farmaceuticas_farmaceutico_id_idx" ON "prescricoes_farmaceuticas"("farmaceutico_id");
CREATE INDEX "eventos_auditoria_alvo_tipo_alvo_id_criado_em_idx" ON "eventos_auditoria"("alvo_tipo", "alvo_id", "criado_em");
CREATE INDEX "eventos_auditoria_ator_id_criado_em_idx" ON "eventos_auditoria"("ator_id", "criado_em");
CREATE UNIQUE INDEX "access_grants_paciente_id_farmaceutico_id_key" ON "access_grants"("paciente_id", "farmaceutico_id");
CREATE INDEX "access_grants_paciente_id_farmaceutico_id_idx" ON "access_grants"("paciente_id", "farmaceutico_id");
CREATE INDEX "access_grants_expira_em_revogado_em_idx" ON "access_grants"("expira_em", "revogado_em");

-- AddForeignKey
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prontuario_entradas" ADD CONSTRAINT "prontuario_entradas_prontuario_id_fkey" FOREIGN KEY ("prontuario_id") REFERENCES "prontuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prontuario_entradas" ADD CONSTRAINT "prontuario_entradas_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prontuario_entradas" ADD CONSTRAINT "prontuario_entradas_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protocolos_atendimento" ADD CONSTRAINT "protocolos_atendimento_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protocolos_versoes" ADD CONSTRAINT "protocolos_versoes_protocolo_id_fkey" FOREIGN KEY ("protocolo_id") REFERENCES "protocolos_atendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "protocolos_versoes" ADD CONSTRAINT "protocolos_versoes_publicado_por_fkey" FOREIGN KEY ("publicado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anexos_clinicos" ADD CONSTRAINT "anexos_clinicos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anexos_clinicos" ADD CONSTRAINT "anexos_clinicos_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "anexos_clinicos" ADD CONSTRAINT "anexos_clinicos_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "prontuario_entradas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "anexos_clinicos" ADD CONSTRAINT "anexos_clinicos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescricoes_farmaceuticas" ADD CONSTRAINT "prescricoes_farmaceuticas_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescricoes_farmaceuticas" ADD CONSTRAINT "prescricoes_farmaceuticas_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "eventos_auditoria" ADD CONSTRAINT "eventos_auditoria_ator_id_fkey" FOREIGN KEY ("ator_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_farmaceutico_id_fkey" FOREIGN KEY ("farmaceutico_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
