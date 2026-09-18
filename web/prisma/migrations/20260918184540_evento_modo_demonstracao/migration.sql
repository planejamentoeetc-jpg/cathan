-- AlterEnum
ALTER TYPE "FormaPagamento" ADD VALUE 'DEMONSTRACAO';

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "modo_demonstracao" BOOLEAN NOT NULL DEFAULT false;
