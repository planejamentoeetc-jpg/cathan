import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público (sem autenticação de sessão) — mesmo modelo de segurança da tela
// de acompanhamento (GET /api/pedidos/[pedidoId]): quem tem o link do pedido pode agir
// sobre ele. Libera um item específico, que estava "segurado" (compra em massa), pra
// produção — a partir daqui ele passa a aparecer na fila do quiosque e no telão.
export async function POST(_req: NextRequest, { params }: { params: { itemId: string } }) {
  const item = await prisma.itemSubPedido.findUnique({ where: { id: params.itemId } });

  if (!item) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }

  if (item.liberadoParaProducao) {
    return NextResponse.json({ ok: true, jaLiberado: true });
  }

  await prisma.itemSubPedido.update({
    where: { id: params.itemId },
    data: { liberadoParaProducao: true, liberadoEm: new Date() },
  });

  return NextResponse.json({ ok: true });
}
