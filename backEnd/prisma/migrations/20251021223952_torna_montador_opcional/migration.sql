-- DropForeignKey
ALTER TABLE "public"."Projeto" DROP CONSTRAINT "Projeto_montadorId_fkey";

-- AlterTable
ALTER TABLE "public"."Projeto" ALTER COLUMN "montadorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Projeto" ADD CONSTRAINT "Projeto_montadorId_fkey" FOREIGN KEY ("montadorId") REFERENCES "public"."Montador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
