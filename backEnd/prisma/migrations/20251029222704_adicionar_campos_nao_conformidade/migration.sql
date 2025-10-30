-- AlterTable
ALTER TABLE "public"."Projeto" ADD COLUMN     "descricaoNaoConformidade" TEXT,
ADD COLUMN     "teveNaoConformidade" BOOLEAN NOT NULL DEFAULT false;
