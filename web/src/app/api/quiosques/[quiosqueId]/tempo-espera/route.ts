import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

const MAXIMO_MINUTOS = 180;

export async function PATCH(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

  let corpo: { minutos?: number | null };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const minutos = corpo.minutos ?? null;
  if (minutos !== null && (!Number.isInteger(minutos) || minutos < 1 || minutos > MAXIMO_MINUTOS)) {
    return NextResponse.json(
      { erro: `Informe um tempo entre 1 e ${MAXIMO_MINUTOS} minutos.` },
      { status: 400 }
    );
  }

  const atualizado = await prisma.quiosque.update({
    where: { id: params.quiosqueId },
    data: { tempoEsperaMinutos: minutos },
  });

  return NextResponse.json({ tempoEsperaMinutos: atualizado.tempoEsperaMinutos });
}
