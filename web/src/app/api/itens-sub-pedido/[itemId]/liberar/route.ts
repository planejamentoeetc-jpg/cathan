import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CorpoRequisicao = {
  // quantas unidades A MAIS liberar agora; omitido = libera tudo que resta
  quantidade?: number;
};

// Endpoint público (sem autenticação de sessão) — mesmo modelo de segurança da tela
// de acompanhamento (GET /api/pedidos/[pedidoId]): quem tem o link do pedido pode agir
// sobre ele. Libera uma quantidade (parcial ou total) de um item que estava "segurado"
// (compra em massa), pra produção — a partir daqui essa fatia passa a aparecer na
// fila do quiosque e no telão.
export async function POST(req: NextRequest, { params }: { params: { itemId: string } }) {
  const item = await prisma.itemSubPedido.findUnique({ where: { id: params.itemId } });

  if (!item) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }

  const restante = item.quantidade - item.quantidadeLiberada;
  if (restante <= 0) {
    return NextResponse.json({ ok: true, jaLiberado: true, quantidadeLiberada: item.quantidadeLiberada });
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

  const quantidadeLiberada = item.quantidadeLiberada + quantidadeParaLiberar;

  await prisma.itemSubPedido.update({
    where: { id: params.itemId },
    data: {
      quantidadeLiberada,
      liberadoEm: item.liberadoEm ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true, quantidadeLiberada });
}
