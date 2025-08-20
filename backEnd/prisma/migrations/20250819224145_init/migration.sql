-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "numero_registro" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Montador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "numero_registro" TEXT NOT NULL,

    CONSTRAINT "Montador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Projeto" (
    "id" SERIAL NOT NULL,
    "codigo_projeto" TEXT NOT NULL,
    "nome_empresa" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "descricao" TEXT,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_entrega" TIMESTAMP(3),
    "montadorId" INTEGER NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_numero_registro_key" ON "public"."Usuario"("numero_registro");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Montador_numero_registro_key" ON "public"."Montador"("numero_registro");

-- AddForeignKey
ALTER TABLE "public"."Projeto" ADD CONSTRAINT "Projeto_montadorId_fkey" FOREIGN KEY ("montadorId") REFERENCES "public"."Montador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
