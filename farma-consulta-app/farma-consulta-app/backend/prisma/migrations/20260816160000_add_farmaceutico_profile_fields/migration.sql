-- Campos adicionais do perfil do farmacêutico.
ALTER TABLE "usuarios"
  ADD COLUMN "tratamento" TEXT,
  ADD COLUMN "crf" TEXT,
  ADD COLUMN "banco" TEXT,
  ADD COLUMN "agencia" TEXT,
  ADD COLUMN "conta_bancaria" TEXT,
  ADD COLUMN "chave_pix" TEXT;

