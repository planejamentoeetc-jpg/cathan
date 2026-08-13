-- Novo formato de código de retirada (2 letras do quiosque + sequencial de 3 dígitos, ex.: "PA001")
ALTER TABLE "sub_pedidos" ALTER COLUMN "codigo_retirada" TYPE VARCHAR(8);

-- "cliente a caminho": sinal (não é status formal) de que o cliente já tocou "Estou indo!"
ALTER TABLE "sub_pedidos" ADD COLUMN "cliente_a_caminho_em" TIMESTAMP(3);

-- Liberação de produção por unidade em vez de tudo-ou-nada por item
ALTER TABLE "itens_sub_pedido" ADD COLUMN "quantidade_liberada" INTEGER NOT NULL DEFAULT 0;

-- Backfill: itens já totalmente liberados viram "toda a quantidade liberada"
UPDATE "itens_sub_pedido" SET "quantidade_liberada" = "quantidade" WHERE "liberado_para_producao" = true;

ALTER TABLE "itens_sub_pedido" DROP COLUMN "liberado_para_producao";
