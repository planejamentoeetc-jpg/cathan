import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

export async function GET(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({
    where: { id: params.quiosqueId },
    select: { id: true, tipo: true, senhaHash: true },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

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
