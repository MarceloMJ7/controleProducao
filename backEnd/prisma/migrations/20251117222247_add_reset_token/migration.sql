-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN     "resetExpires" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT;
