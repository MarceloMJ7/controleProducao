/*
  Warnings:

  - Added the required column `criadoPorId` to the `Projeto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Projeto" ADD COLUMN     "criadoPorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Projeto" ADD CONSTRAINT "Projeto_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
