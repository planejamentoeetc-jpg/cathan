import { FormaPagamento, ModalidadeQuiosque, StatusSubPedido } from "@prisma/client";
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
  // Só a Venda Manual usa isso (true): gera um ticket/código separado por PRODUTO,
  // mesmo quando são do mesmo quiosque -- sem isso, dois produtos diferentes do
  // mesmo quiosque numa mesma venda caem no mesmo ticket, e o quiosque não
  // consegue fechar/retirar um produto sem esperar o outro ficar pronto junto.
  // O checkout do cliente (Pix) continua agrupando por quiosque como sempre
  // (default false) -- não foi pedido mudar esse fluxo.
  umTicketPorProduto?: boolean;
}) {
  const {
    eventoId,
    clienteNome,
    clienteCelular,
    itens,
    formaPagamento = FormaPagamento.MERCADO_PAGO,
    liberarProducaoAutomaticamente = false,
    umTicketPorProduto = false,
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

  const grupos = new Map<string, { quiosqueId: string; itens: ItemPedidoValidado[] }>();
  itens.forEach((item, indice) => {
    const produto = produtosPorId.get(item.produtoId)!;
    // com umTicketPorProduto, cada ENTRADA da lista vira seu próprio ticket --
    // a chave usa o índice, não o produtoId, então nem duas entradas do mesmo
    // produto se juntam. Isso só funciona porque quem chama (Venda Manual) já
    // explode a quantidade em entradas de 1 unidade cada antes de chegar aqui
    // (ver api/caixa/[eventoId]/vender/route.ts) -- sem isso, um "3x Pastel" em
    // uma única entrada continuaria virando 1 ticket só, como sempre foi.
    const chave = umTicketPorProduto ? `${produto.quiosqueId}::${indice}` : produto.quiosqueId;
    const grupo = grupos.get(chave) ?? { quiosqueId: produto.quiosqueId, itens: [] };
    grupo.itens.push(item);
    grupos.set(chave, grupo);
  });

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

    for (const { quiosqueId, itens: itensDoGrupo } of grupos.values()) {
      const quiosque = produtosPorId.get(itensDoGrupo[0].produtoId)!.quiosque;

      // Bebida não tem preparo -- já nasce PRONTA pra retirar, pulando os passos
      // de aceitar/produzir. O cliente já recebe o aviso de "pode buscar" assim
      // que o item é liberado (ver quantidadeLiberada abaixo), e o quiosque só
      // precisa apertar "entregue" quando a pessoa chegar no balcão.
      const jaNasceProntaBebida = quiosque.modalidade === ModalidadeQuiosque.BEBIDAS;
      const agora = new Date();

      const subPedido = await criarSubPedidoComCodigoUnico(tx, quiosqueId, quiosque.nome, (codigo) =>
        tx.subPedido.create({
          data: {
            pedidoId: pedido.id,
            quiosqueId,
            codigoRetirada: codigo,
            ...(jaNasceProntaBebida
              ? { status: StatusSubPedido.PRONTO, aceitoEm: agora, prontoEm: agora }
              : {}),
            itens: {
              create: itensDoGrupo.map((item) => {
                // Comprou só 1 unidade? Manda direto pra produção, sem esperar
                // comando do cliente — igual qualquer compra online. A escolha de
                // liberar aos poucos só faz sentido quando ele levou mais de 1.
                const liberaAgora = liberarProducaoAutomaticamente || item.quantidade === 1;
                return {
                  produtoId: item.produtoId,
                  quantidade: item.quantidade,
                  precoUnitario: item.precoUnitario,
                  observacao: item.observacao,
                  nomesCriancas:
                    quiosque.modalidade === ModalidadeQuiosque.BRINCADEIRAS
                      ? (item.nomesCriancas ?? []).map((n) => n.trim()).filter(Boolean)
                      : [],
                  quantidadeLiberada: liberaAgora ? item.quantidade : 0,
                  liberadoEm: liberaAgora ? new Date() : null,
                };
              }),
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
