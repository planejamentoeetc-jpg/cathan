import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { eventoId: string } }) {
  const mensagens = await prisma.mensagemSuporte.findMany({
    where: { eventoId: params.eventoId },
    orderBy: { criadoEm: "asc" },
  });
  return NextResponse.json(mensagens);
}

export async function POST(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  let corpo: { texto?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.texto?.trim()) {
    return NextResponse.json({ erro: "Escreva uma mensagem." }, { status: 400 });
  }

  const mensagem = await prisma.mensagemSuporte.create({
    data: { eventoId: params.eventoId, de: "CATHAN", texto: corpo.texto.trim() },
  });

  return NextResponse.json(mensagem, { status: 201 });
}
