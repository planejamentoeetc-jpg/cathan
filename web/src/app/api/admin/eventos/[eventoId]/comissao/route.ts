import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function validarPercentual(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 && valor <= 100;
}

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  let corpo: { comissaoPercentual?: number; comissaoOrganizadorPercentual?: number };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!validarPercentual(corpo.comissaoPercentual)) {
    return NextResponse.json({ erro: "Informe uma % entre 0 e 100 pra comissão da Cathan." }, { status: 400 });
  }
  if (corpo.comissaoOrganizadorPercentual !== undefined && !validarPercentual(corpo.comissaoOrganizadorPercentual)) {
    return NextResponse.json({ erro: "Informe uma % entre 0 e 100 pra comissão do organizador." }, { status: 400 });
  }
  if ((corpo.comissaoOrganizadorPercentual ?? 0) + corpo.comissaoPercentual > 100) {
    return NextResponse.json(
      { erro: "A soma das duas comissões não pode passar de 100%." },
      { status: 400 }
    );
  }

  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.evento.update({
    where: { id: params.eventoId },
    data: {
      comissaoPercentual: corpo.comissaoPercentual,
      ...(corpo.comissaoOrganizadorPercentual !== undefined
        ? { comissaoOrganizadorPercentual: corpo.comissaoOrganizadorPercentual }
        : {}),
    },
  });

  return NextResponse.json({
    comissaoPercentual: Number(atualizado.comissaoPercentual),
    comissaoOrganizadorPercentual: Number(atualizado.comissaoOrganizadorPercentual),
  });
}
