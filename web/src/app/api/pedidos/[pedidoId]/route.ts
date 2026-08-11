import { StatusSubPedido } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// status em que o sub-pedido ainda está "na fila de espera" pra virar pronto/chamado
const STATUS_EM_ESPERA: StatusSubPedido[] = [
  StatusSubPedido.RECEBIDO,
  StatusSubPedido.ACEITO,
  StatusSubPedido.EM_PRODUCAO,
];

export async function GET(_req: NextRequest, { params }: { params: { pedidoId: string } }) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: params.pedidoId },
    include: {
      subPedidos: {
        include: {
          quiosque: {
            select: {
              id: true,
              nome: true,
              cor: true,
              modalidade: true,
              mensagemPreparando: true,
              mensagemPronto: true,
            },
          },
          itens: {
            include: { produto: { select: { nome: true } } },
          },
        },
        orderBy: { criadoEm: "asc" },
      },
    },
  });

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  // "você é o próximo": este sub-pedido é o mais antigo ainda em espera na fila do seu quiosque
  const quiosqueIds = [...new Set(pedido.subPedidos.map((sp) => sp.quiosqueId))];
  const frenteDaFilaPorQuiosque = new Map<string, string>();
  for (const quiosqueId of quiosqueIds) {
    const proximo = await prisma.subPedido.findFirst({
      where: { quiosqueId, status: { in: STATUS_EM_ESPERA } },
      orderBy: { criadoEm: "asc" },
      select: { id: true },
    });
    if (proximo) frenteDaFilaPorQuiosque.set(quiosqueId, proximo.id);
  }

  return NextResponse.json({
    id: pedido.id,
    criadoEm: pedido.criadoEm,
    subPedidos: pedido.subPedidos.map((sp) => ({
      id: sp.id,
      status: sp.status,
      codigoRetirada: sp.codigoRetirada,
      quiosque: sp.quiosque,
      vocEProximo:
        STATUS_EM_ESPERA.includes(sp.status) && frenteDaFilaPorQuiosque.get(sp.quiosqueId) === sp.id,
      itens: sp.itens.map((item) => ({
        id: item.id,
        nome: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
        observacao: item.observacao,
        nomesCriancas: item.nomesCriancas,
        liberadoParaProducao: item.liberadoParaProducao,
      })),
    })),
  });
}
