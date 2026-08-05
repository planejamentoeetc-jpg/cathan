-- AlterEnum
ALTER TYPE "StatusSubPedido" ADD VALUE 'CHAMADO';
ALTER TYPE "StatusSubPedido" ADD VALUE 'APROVEITANDO';
ALTER TYPE "StatusSubPedido" ADD VALUE 'CONCLUIDO';

-- AlterTable: nomesCriancas sai do sub-pedido (era um campo só para o pedido inteiro)
ALTER TABLE "sub_pedidos" DROP COLUMN "nomes_criancas";
ALTER TABLE "sub_pedidos" ADD COLUMN "chamado_em" TIMESTAMP(3);
ALTER TABLE "sub_pedidos" ADD COLUMN "inicio_aproveitamento_em" TIMESTAMP(3);
ALTER TABLE "sub_pedidos" ADD COLUMN "concluido_em" TIMESTAMP(3);

-- AlterTable: nomesCriancas passa a ser por item (um nome por unidade)
ALTER TABLE "itens_sub_pedido" ADD COLUMN "nomes_criancas" TEXT[];
