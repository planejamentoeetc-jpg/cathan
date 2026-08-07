-- CreateEnum
CREATE TYPE "StatusPedidoPendente" AS ENUM ('PENDENTE', 'CONFIRMADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "pedidos_pendentes" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "cliente_celular" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "status" "StatusPedidoPendente" NOT NULL DEFAULT 'PENDENTE',
    "mp_preference_id" TEXT,
    "mp_payment_id" TEXT,
    "pedido_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pendentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_pendentes_pedido_id_key" ON "pedidos_pendentes"("pedido_id");

-- AddForeignKey
ALTER TABLE "pedidos_pendentes" ADD CONSTRAINT "pedidos_pendentes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_pendentes" ADD CONSTRAINT "pedidos_pendentes_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
