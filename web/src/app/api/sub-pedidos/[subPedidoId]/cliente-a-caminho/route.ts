import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público (sem autenticação de sessão) — mesmo modelo de segurança de
// GET /api/pedidos/[pedidoId]: quem tem o link do pedido pode agir sobre ele.
// Marca que o cliente já tocou "Estou indo!" no pop-up de pronto/chamado — não é
// uma transição de status, só um sinal extra pra equipe do quiosque na fila.
export async function POST(_req: NextRequest, { params }: { params: { subPedidoId: string } }) {
  const subPedido = await prisma.subPedido.findUnique({ where: { id: params.subPedidoId } });

  if (!subPedido) {
    return NextResponse.json({ erro: "Sub-pedido não encontrado." }, { status: 404 });
  }

  if (subPedido.clienteACaminhoEm === null) {
    await prisma.subPedido.update({
      where: { id: params.subPedidoId },
      data: { clienteACaminhoEm: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
