-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('MERCADO_PAGO', 'DINHEIRO');

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "forma_pagamento" "FormaPagamento" NOT NULL DEFAULT 'MERCADO_PAGO';
