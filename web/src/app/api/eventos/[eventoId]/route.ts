import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposEvento, validarCamposEvento } from "@/lib/validarEvento";

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  let corpo: CamposEvento;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const resultado = validarCamposEvento(corpo);
  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  }

  const atualizado = await prisma.evento.update({
    where: { id: params.eventoId },
    data: resultado.dados,
  });

  return NextResponse.json({ id: atualizado.id });
}
