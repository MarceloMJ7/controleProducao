/*
  Warnings:

  - Made the column `data_entrega` on table `Projeto` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Projeto" ALTER COLUMN "data_entrega" SET NOT NULL;
