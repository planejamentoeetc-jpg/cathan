-- AlterTable
ALTER TABLE "itens_sub_pedido" ADD COLUMN     "liberado_em" TIMESTAMP(3),
ADD COLUMN     "liberado_para_producao" BOOLEAN NOT NULL DEFAULT false;
