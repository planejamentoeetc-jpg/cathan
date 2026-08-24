import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
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
