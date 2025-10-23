/*
  Warnings:

  - You are about to drop the column `montadorId` on the `Projeto` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codigo_projeto]` on the table `Projeto` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Projeto" DROP CONSTRAINT "Projeto_montadorId_fkey";

-- AlterTable
ALTER TABLE "public"."Projeto" DROP COLUMN "montadorId",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data_cadastro" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."_ProjetoMontadores" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProjetoMontadores_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjetoMontadores_B_index" ON "public"."_ProjetoMontadores"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Projeto_codigo_projeto_key" ON "public"."Projeto"("codigo_projeto");

-- AddForeignKey
ALTER TABLE "public"."_ProjetoMontadores" ADD CONSTRAINT "_ProjetoMontadores_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Montador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProjetoMontadores" ADD CONSTRAINT "_ProjetoMontadores_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
