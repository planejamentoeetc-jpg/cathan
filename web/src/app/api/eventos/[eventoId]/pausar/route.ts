import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  let corpo: { pausado?: boolean };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (typeof corpo.pausado !== "boolean") {
    return NextResponse.json({ erro: "Campo 'pausado' é obrigatório." }, { status: 400 });
  }

  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
  });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.evento.update({
    where: { id: params.eventoId },
    data: { pedidosPausados: corpo.pausado },
  });

  return NextResponse.json({ pedidosPausados: atualizado.pedidosPausados });
}
