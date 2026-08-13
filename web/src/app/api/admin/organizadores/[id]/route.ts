import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const organizador = await prisma.organizador.findUnique({ where: { id: params.id } });
  if (!organizador) {
    return NextResponse.json({ erro: "Organizador não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.organizador.update({
    where: { id: params.id },
    data: { comissaoPercentual: corpo.comissaoPercentual },
  });

  return NextResponse.json({ comissaoPercentual: Number(atualizado.comissaoPercentual) });
}
