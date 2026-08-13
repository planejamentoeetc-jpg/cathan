import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { CamposEvento, validarCamposEvento } from "@/lib/validarEvento";

export async function POST(req: NextRequest) {
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

  const evento = await prisma.evento.create({
    data: { ...resultado.dados, organizadorId: obterOrganizadorId() },
  });

  return NextResponse.json({ id: evento.id }, { status: 201 });
}
