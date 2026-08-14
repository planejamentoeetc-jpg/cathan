import { FormaPagamento, ModalidadeQuiosque } from "@prisma/client";
import { criarSubPedidoComCodigoUnico } from "@/lib/codigoRetirada";
import { prisma, transacaoComRetry } from "@/lib/prisma";

export type ItemPedidoValidado = {
  produtoId: string;
  quantidade: number;
  // preço travado no momento em que o checkout foi iniciado (é o valor efetivamente cobrado no Mercado Pago)
  precoUnitario: number;
  observacao?: string;
  nomesCriancas?: string[];
};

export class PedidoInvalidoError extends Error {}

/**
 * Cria o Pedido/SubPedido/ItemSubPedido reais a partir de itens já validados no
 * checkout (ver POST /api/pedidos). Chamada quando o pagamento é confirmado pelo
 * webhook do Mercado Pago — antes disso, só existe um PedidoPendente.
 *
 * Revalida produto ativo/estoque aqui porque um tempo real se passou entre o
 * início do checkout e a confirmação do pagamento (PIX pode levar minutos).
 */
export async function criarPedidoAPartirDeItensValidados(params: {
  eventoId: string;
  clienteNome: string;
  clienteCelular: string;
  itens: ItemPedidoValidado[];
  formaPagamento?: FormaPagamento;
  // Venda Manual (Caixa) libera pra produção na hora — é uma compra presencial em
  // tempo real, não faz sentido segurar. Pedidos do cliente (Pix) nascem segurados
  // (false): o próprio cliente decide, item a item, quando mandar pra produção.
  liberarProducaoAutomaticamente?: boolean;
}) {
  const {
    eventoId,
    clienteNome,
    clienteCelular,
    itens,
    formaPagamento = FormaPagamento.MERCADO_PAGO,
    liberarProducaoAutomaticamente = false,
  } = params;

  const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
  const produtos = await prisma.produto.findMany({
    where: { id: { in: produtoIds } },
    include: { quiosque: true },
  });

  if (produtos.length !== produtoIds.length) {
    throw new PedidoInvalidoError("Produto inválido no carrinho.");
  }

  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

  for (const produto of produtos) {
    if (produto.quiosque.eventoId !== eventoId) {
      throw new PedidoInvalidoError(`Produto "${produto.nome}" não pertence a este evento.`);
    }
    if (!produto.ativo) {
      throw new PedidoInvalidoError(`Produto "${produto.nome}" está esgotado.`);
    }
  }

  const quantidadePorProduto = new Map<string, number>();
  for (const item of itens) {
    quantidadePorProduto.set(item.produtoId, (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade);
  }
  for (const [produtoId, quantidade] of quantidadePorProduto) {
    const produto = produtosPorId.get(produtoId)!;
    if (produto.estoque !== null && produto.estoque < quantidade) {
      throw new PedidoInvalidoError(`Estoque insuficiente para "${produto.nome}".`);
    }
  }

  const itensPorQuiosque = new Map<string, ItemPedidoValidado[]>();
  for (const item of itens) {
    const produto = produtosPorId.get(item.produtoId)!;
    const grupo = itensPorQuiosque.get(produto.quiosqueId) ?? [];
    grupo.push(item);
    itensPorQuiosque.set(produto.quiosqueId, grupo);
  }

  return transacaoComRetry(() => prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.upsert({
      where: { celular: clienteCelular },
      update: { nome: clienteNome },
      create: { nome: clienteNome, celular: clienteCelular },
    });

    const pedido = await tx.pedido.create({
      data: { eventoId, clienteId: cliente.id, formaPagamento },
    });

    const subPedidosCriados = [];

    for (const [quiosqueId, itensDoGrupo] of itensPorQuiosque) {
      const quiosque = produtosPorId.get(itensDoGrupo[0].produtoId)!.quiosque;

      const subPedido = await criarSubPedidoComCodigoUnico(tx, quiosqueId, quiosque.nome, (codigo) =>
        tx.subPedido.create({
          data: {
            pedidoId: pedido.id,
            quiosqueId,
            codigoRetirada: codigo,
            itens: {
              create: itensDoGrupo.map((item) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                precoUnitario: item.precoUnitario,
                observacao: item.observacao,
                nomesCriancas:
                  quiosque.modalidade === ModalidadeQuiosque.BRINCADEIRAS
                    ? (item.nomesCriancas ?? []).map((n) => n.trim()).filter(Boolean)
                    : [],
                quantidadeLiberada: liberarProducaoAutomaticamente ? item.quantidade : 0,
                liberadoEm: liberarProducaoAutomaticamente ? new Date() : null,
              })),
            },
          },
        })
      );

      subPedidosCriados.push({
        id: subPedido.id,
        quiosqueId,
        quiosqueNome: quiosque.nome,
        codigoRetirada: subPedido.codigoRetirada,
        status: subPedido.status,
      });
    }

    for (const [produtoId, quantidade] of quantidadePorProduto) {
      const produto = produtosPorId.get(produtoId)!;
      if (produto.estoque !== null) {
        await tx.produto.update({
          where: { id: produtoId },
          data: { estoque: { decrement: quantidade } },
        });
      }
    }

    return { pedidoId: pedido.id, subPedidos: subPedidosCriados };
  // timeout padrão do Prisma (5s) é curto demais aqui: a transação faz várias
  // idas ao banco (upsert de cliente, criação por quiosque com retry de código
  // único, baixa de estoque) e já foi vista estourando em produção, mesmo com
  // o retry de transacaoComRetry — cada tentativa individual precisa de folga.
  }, { timeout: 15000, maxWait: 5000 }));
}
