import { StatusSubPedido } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público (sem autenticação de sessão) -- mesmo modelo de segurança de
// GET /api/pedidos/[pedidoId] e /cliente-a-caminho: quem tem o link do pedido
// pode agir sobre ele. Só o CLIENTE usa esta rota (confirma que recebeu a
// entrega), por isso não fica em retiradoPorUsuarioId como as ações da equipe.
export async function POST(req: NextRequest, { params }: { params: { subPedidoId: string } }) {
  let corpo: { observacao?: string } = {};
  try {
    corpo = await req.json();
  } catch {
    // corpo vazio é válido -- observação é opcional
  }

  const subPedido = await prisma.subPedido.findUnique({
    where: { id: params.subPedidoId },
    include: { pedido: { select: { tipoEntrega: true } } },
  });

  if (!subPedido) {
    return NextResponse.json({ erro: "Sub-pedido não encontrado." }, { status: 404 });
  }
  if (subPedido.pedido.tipoEntrega !== "ENTREGA") {
    return NextResponse.json({ erro: "Este pedido não é de entrega." }, { status: 400 });
  }
  if (subPedido.status !== StatusSubPedido.PRONTO) {
    return NextResponse.json(
      { erro: `Não é possível confirmar a partir do status ${subPedido.status}.` },
      { status: 409 }
    );
  }

  const atualizado = await prisma.subPedido.update({
    where: { id: params.subPedidoId },
    data: {
      status: StatusSubPedido.RETIRADO,
      retiradoEm: new Date(),
      observacaoCliente: corpo.observacao?.trim() || null,
    },
  });

  return NextResponse.json({ id: atualizado.id, status: atualizado.status });
}
