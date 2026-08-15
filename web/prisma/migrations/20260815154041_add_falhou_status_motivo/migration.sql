-- AlterEnum
ALTER TYPE "StatusPedidoPendente" ADD VALUE 'FALHOU';

-- AlterTable
ALTER TABLE "pedidos_pendentes" ADD COLUMN     "motivo_falha" TEXT;
