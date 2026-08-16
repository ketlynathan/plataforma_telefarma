ALTER TABLE "consultas"
  ADD COLUMN "farmaceutico_entrou_em" TIMESTAMP(3),
  ADD COLUMN "cliente_entrou_em" TIMESTAMP(3),
  ADD COLUMN "tolerancia_min" INTEGER NOT NULL DEFAULT 15;

