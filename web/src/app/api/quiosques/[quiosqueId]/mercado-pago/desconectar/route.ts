import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

export async function POST(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

  await prisma.quiosque.update({
    where: { id: params.quiosqueId },
    data: {
      mpUserId: null,
      mpAccessTokenCifrado: null,
      mpRefreshTokenCifrado: null,
      mpTokenExpiraEm: null,
    },
  });

  return NextResponse.json({ ok: true });
}
