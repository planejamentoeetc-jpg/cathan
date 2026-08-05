import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";

export async function GET(_req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({
    where: { id: params.quiosqueId },
    select: { id: true, nome: true, modalidade: true },
  });

  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  const subPedidos = await prisma.subPedido.findMany({
    where: { quiosqueId: params.quiosqueId, status: { in: STATUS_ATIVOS } },
    orderBy: { criadoEm: "asc" },
    include: {
      pedido: { include: { cliente: { select: { nome: true } } } },
      itens: { include: { produto: { select: { nome: true, tempoProducaoMinutos: true } } } },
    },
  });

  return NextResponse.json({
    quiosque,
    pedidos: subPedidos.map((sp) => {
      const nomesCriancas = sp.itens.flatMap((item) => item.nomesCriancas);
      // sessão dura o tempo da atividade mais longa entre os itens do sub-pedido
      const duracaoMinutos = Math.max(0, ...sp.itens.map((item) => item.produto.tempoProducaoMinutos));

      return {
        id: sp.id,
        status: sp.status,
        codigoRetirada: sp.codigoRetirada,
        criadoEm: sp.criadoEm,
        clienteNome: sp.pedido.cliente.nome,
        nomesCriancas,
        duracaoMinutos,
        inicioAproveitamentoEm: sp.inicioAproveitamentoEm,
        itens: sp.itens.map((item) => ({
          nome: item.produto.nome,
          quantidade: item.quantidade,
          observacao: item.observacao,
          nomesCriancas: item.nomesCriancas,
        })),
      };
    }),
  });
}
