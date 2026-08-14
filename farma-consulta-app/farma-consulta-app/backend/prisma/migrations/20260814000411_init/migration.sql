-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "telefone" TEXT,
    "cpf" TEXT,
    "data_nascimento" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "doencas_cronicas" TEXT,
    "alergias" TEXT,
    "medicamentos_uso" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" TEXT NOT NULL,
    "paciente_nome" TEXT NOT NULL,
    "paciente_email" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Agendada',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "consultas_paciente_email_idx" ON "consultas"("paciente_email");
