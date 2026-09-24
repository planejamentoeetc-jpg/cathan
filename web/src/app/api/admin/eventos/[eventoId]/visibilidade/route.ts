import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  let corpo: { visivelNaLista?: boolean };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (typeof corpo.visivelNaLista !== "boolean") {
    return NextResponse.json({ erro: "Informe visivelNaLista." }, { status: 400 });
  }

  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.evento.update({
    where: { id: params.eventoId },
    data: { visivelNaLista: corpo.visivelNaLista },
  });

  return NextResponse.json({ visivelNaLista: atualizado.visivelNaLista });
}
