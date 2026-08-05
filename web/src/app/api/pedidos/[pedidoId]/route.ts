import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { pedidoId: string } }) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: params.pedidoId },
    include: {
      subPedidos: {
        include: {
          quiosque: { select: { id: true, nome: true, cor: true, modalidade: true } },
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

  return NextResponse.json({
    id: pedido.id,
    criadoEm: pedido.criadoEm,
    subPedidos: pedido.subPedidos.map((sp) => ({
      id: sp.id,
      status: sp.status,
      codigoRetirada: sp.codigoRetirada,
      quiosque: sp.quiosque,
      itens: sp.itens.map((item) => ({
        nome: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
        observacao: item.observacao,
        nomesCriancas: item.nomesCriancas,
      })),
    })),
  });
}
