import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

export async function POST(_req: NextRequest) {
  await prisma.organizador.update({
    where: { id: obterOrganizadorId() },
    data: {
      mpUserId: null,
      mpAccessTokenCifrado: null,
      mpRefreshTokenCifrado: null,
      mpTokenExpiraEm: null,
    },
  });

  return NextResponse.json({ ok: true });
}
