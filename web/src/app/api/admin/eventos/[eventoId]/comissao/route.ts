import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  let corpo: { comissaoPercentual?: number };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (
    typeof corpo.comissaoPercentual !== "number" ||
    !Number.isFinite(corpo.comissaoPercentual) ||
    corpo.comissaoPercentual < 0 ||
    corpo.comissaoPercentual > 100
  ) {
    return NextResponse.json({ erro: "Informe uma % entre 0 e 100." }, { status: 400 });
  }

  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.evento.update({
    where: { id: params.eventoId },
    data: { comissaoPercentual: corpo.comissaoPercentual },
  });

  return NextResponse.json({ comissaoPercentual: Number(atualizado.comissaoPercentual) });
}
