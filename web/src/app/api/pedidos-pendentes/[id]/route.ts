import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público de polling — usado pela página de retorno do checkout para
// saber quando o webhook do Mercado Pago confirmou o pagamento.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pedidoPendente = await prisma.pedidoPendente.findUnique({
    where: { id: params.id },
    select: { status: true, pedidoId: true, eventoId: true },
  });

  if (!pedidoPendente) {
    return NextResponse.json({ erro: "Checkout não encontrado." }, { status: 404 });
  }

  return NextResponse.json(pedidoPendente);
}
