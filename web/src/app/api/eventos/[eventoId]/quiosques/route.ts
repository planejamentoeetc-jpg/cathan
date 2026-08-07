import { ModalidadeQuiosque, TipoQuiosque } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Paleta rotativa — atribuída automaticamente conforme quiosques vão sendo criados no evento.
const PALETA_CORES = ["#1E8E5A", "#FFB94A", "#FF7A45", "#16333D", "#1F4E5F"];

type CorpoRequisicao = {
  nome: string;
  modalidade: ModalidadeQuiosque;
};

export async function POST(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.nome?.trim()) {
    return NextResponse.json({ erro: "Informe o nome do quiosque." }, { status: 400 });
  }
  if (!Object.values(ModalidadeQuiosque).includes(corpo.modalidade)) {
    return NextResponse.json({ erro: "Modalidade inválida." }, { status: 400 });
  }

  const totalExistente = await prisma.quiosque.count({ where: { eventoId: evento.id } });

  const quiosque = await prisma.quiosque.create({
    data: {
      eventoId: evento.id,
      nome: corpo.nome.trim(),
      modalidade: corpo.modalidade,
      cor: PALETA_CORES[totalExistente % PALETA_CORES.length],
      tipo: TipoQuiosque.DO_EVENTO,
    },
  });

  return NextResponse.json({ id: quiosque.id }, { status: 201 });
}
