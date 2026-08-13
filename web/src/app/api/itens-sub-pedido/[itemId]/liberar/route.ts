import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";

type CorpoRequisicao = {
  // quantas unidades A MAIS liberar agora; omitido = libera tudo que resta
  quantidade?: number;
};

/**
 * Libera uma quantidade (parcial ou total) de um item que estava "segurado" (compra
 * em massa), pra produção. O código de retirada do cliente NUNCA muda, mesmo que ele
 * libere em várias vezes — por baixo dos panos:
 *
 * - Se o ticket (SubPedido) mais recente desse pedido+quiosque ainda está aberto
 *   (não foi retirado/concluído), a quantidade liberada só soma nele.
 * - Se esse ticket já foi fechado, nasce um novo SubPedido pro mesmo pedido+quiosque,
 *   com o MESMO código de retirada, numa "rodada" nova — aparece pro quiosque como um
 *   pedido novo de verdade (fila, status do zero), mas o cliente nunca vê um código
 *   diferente. Ver o campo `rodada` em schema.prisma.
 */
export async function POST(req: NextRequest, { params }: { params: { itemId: string } }) {
  const item = await prisma.itemSubPedido.findUnique({
    where: { id: params.itemId },
    include: { subPedido: true },
  });

  if (!item) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }

  const restante = item.quantidade - item.quantidadeLiberada;
  if (restante <= 0) {
    return NextResponse.json({ ok: true, jaLiberado: true });
  }

  let corpo: CorpoRequisicao = {};
  try {
    corpo = await req.json();
  } catch {
    // sem corpo = libera tudo que resta (comportamento padrão)
  }

  const quantidadeParaLiberar =
    typeof corpo.quantidade === "number" && corpo.quantidade > 0
      ? Math.min(Math.floor(corpo.quantidade), restante)
      : restante;

  const { pedidoId, quiosqueId, codigoRetirada } = item.subPedido;

  await prisma.$transaction(async (tx) => {
    // busca de novo dentro da transação (não confia no valor lido antes de abrir a
    // transação) pra evitar corrida com outra liberação do mesmo pedido em paralelo
    const rodadaMaisRecente = await tx.subPedido.findFirst({
      where: { pedidoId, quiosqueId },
      orderBy: { rodada: "desc" },
    });
    if (!rodadaMaisRecente) throw new Error("Sub-pedido não encontrado.");

    const rodadaAberta = STATUS_ATIVOS.includes(rodadaMaisRecente.status);

    // caminho simples: a própria rodada do item ainda está aberta — só soma na mesma linha
    if (rodadaAberta && rodadaMaisRecente.id === item.subPedidoId) {
      await tx.itemSubPedido.update({
        where: { id: item.id },
        data: {
          quantidadeLiberada: { increment: quantidadeParaLiberar },
          liberadoEm: item.liberadoEm ?? new Date(),
        },
      });
      return;
    }

    // nomes ainda "soltos" no item original — os primeiros N acompanham o que está
    // sendo liberado agora, o resto continua com o item original
    const nomesParaMover = item.nomesCriancas.slice(0, quantidadeParaLiberar);
    const nomesRestantes = item.nomesCriancas.slice(quantidadeParaLiberar);

    if (rodadaAberta) {
      // já existe uma rodada seguinte (2ª, 3ª...) e ela ainda está aberta — soma lá
      const itemExistente = await tx.itemSubPedido.findFirst({
        where: { subPedidoId: rodadaMaisRecente.id, produtoId: item.produtoId },
      });
      if (itemExistente) {
        await tx.itemSubPedido.update({
          where: { id: itemExistente.id },
          data: {
            quantidade: { increment: quantidadeParaLiberar },
            quantidadeLiberada: { increment: quantidadeParaLiberar },
            nomesCriancas: [...itemExistente.nomesCriancas, ...nomesParaMover],
          },
        });
      } else {
        await tx.itemSubPedido.create({
          data: {
            subPedidoId: rodadaMaisRecente.id,
            produtoId: item.produtoId,
            quantidade: quantidadeParaLiberar,
            quantidadeLiberada: quantidadeParaLiberar,
            precoUnitario: item.precoUnitario,
            observacao: item.observacao,
            nomesCriancas: nomesParaMover,
            liberadoEm: new Date(),
          },
        });
      }
    } else {
      // a rodada mais recente já foi retirada/concluída — abre uma rodada nova, com
      // o MESMO código de retirada, como um ticket novo pro quiosque
      await tx.subPedido.create({
        data: {
          pedidoId,
          quiosqueId,
          codigoRetirada,
          rodada: rodadaMaisRecente.rodada + 1,
          itens: {
            create: {
              produtoId: item.produtoId,
              quantidade: quantidadeParaLiberar,
              quantidadeLiberada: quantidadeParaLiberar,
              precoUnitario: item.precoUnitario,
              observacao: item.observacao,
              nomesCriancas: nomesParaMover,
              liberadoEm: new Date(),
            },
          },
        },
      });
    }

    // tira essa fatia do item original — o que sobra é só o que ainda não foi decidido
    await tx.itemSubPedido.update({
      where: { id: item.id },
      data: {
        quantidade: { decrement: quantidadeParaLiberar },
        nomesCriancas: nomesRestantes,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
