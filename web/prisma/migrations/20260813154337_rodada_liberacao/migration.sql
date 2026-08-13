-- "Rodadas" de liberação: quando um ticket já retirado/concluído recebe mais itens
-- liberados depois, nasce um novo sub-pedido pra mesma família (pedido+quiosque),
-- reaproveitando o MESMO código de retirada, só que numa rodada nova.
ALTER TABLE "sub_pedidos" ADD COLUMN "rodada" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "sub_pedidos_quiosque_id_codigo_retirada_key";

CREATE UNIQUE INDEX "sub_pedidos_quiosque_id_codigo_retirada_rodada_key" ON "sub_pedidos"("quiosque_id", "codigo_retirada", "rodada");
