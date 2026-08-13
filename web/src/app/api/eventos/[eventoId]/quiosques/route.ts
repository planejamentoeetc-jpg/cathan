import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposQuiosque, validarCamposQuiosque } from "@/lib/validarQuiosque";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

// Paleta rotativa — atribuída automaticamente conforme quiosques vão sendo criados no evento.
const PALETA_CORES = ["#1E8E5A", "#FFB94A", "#FF7A45", "#16333D", "#1F4E5F"];

export async function POST(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
  });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  let corpo: CamposQuiosque;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const resultado = validarCamposQuiosque(corpo);
  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  }

  const totalExistente = await prisma.quiosque.count({ where: { eventoId: evento.id } });

  const quiosque = await prisma.quiosque.create({
    data: {
      eventoId: evento.id,
      cor: PALETA_CORES[totalExistente % PALETA_CORES.length],
      ...resultado.dados,
    },
  });

  return NextResponse.json({ id: quiosque.id }, { status: 201 });
}
