import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const pedidos = await prisma.pedido.findMany({
    where: {
      formaPagamento: "DINHEIRO",
      subPedidos: { some: { quiosqueId: params.quiosqueId } },
    },
    orderBy: { criadoEm: "desc" },
    take: 30,
    include: {
      cliente: { select: { nome: true } },
      subPedidos: {
        where: { quiosqueId: params.quiosqueId },
        include: {
          quiosque: { select: { nome: true, cor: true } },
          itens: { include: { produto: { select: { nome: true } } } },
        },
      },
    },
  });

  return NextResponse.json(
    pedidos.map((pedido) => ({
      id: pedido.id,
      criadoEm: pedido.criadoEm,
      clienteNome: pedido.cliente.nome,
      subPedidos: pedido.subPedidos.map((sp) => ({
        id: sp.id,
        codigoRetirada: sp.codigoRetirada,
        status: sp.status,
        quiosqueNome: sp.quiosque.nome,
        quiosqueCor: sp.quiosque.cor,
        itens: sp.itens.map((item) => `${item.quantidade}× ${item.produto.nome}`),
      })),
    }))
  );
}
