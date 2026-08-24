import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

export async function POST(_req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const organizadorId = obterOrganizadorId();

  const quiosque = await prisma.quiosque.findUnique({
    where: { id: params.quiosqueId },
    select: { evento: { select: { organizadorId: true } } },
  });
  if (!quiosque || quiosque.evento.organizadorId !== organizadorId) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

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
