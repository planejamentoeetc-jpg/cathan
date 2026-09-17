-- AlterEnum
ALTER TYPE "FormaPagamento" ADD VALUE 'PAGARME';

-- AlterTable
ALTER TABLE "pedidos_pendentes" ADD COLUMN     "pagarme_order_id" TEXT;
