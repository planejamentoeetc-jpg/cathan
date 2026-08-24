import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  let corpo: { comissaoPercentual?: number | null };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  // null = volta a usar a % padrão do evento (remove a exceção deste quiosque)
  if (
    corpo.comissaoPercentual !== null &&
    (typeof corpo.comissaoPercentual !== "number" ||
      !Number.isFinite(corpo.comissaoPercentual) ||
      corpo.comissaoPercentual < 0 ||
      corpo.comissaoPercentual > 100)
  ) {
    return NextResponse.json({ erro: "Informe uma % entre 0 e 100, ou deixe em branco." }, { status: 400 });
  }

  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.quiosque.update({
    where: { id: params.quiosqueId },
    data: { comissaoPercentual: corpo.comissaoPercentual },
  });

  return NextResponse.json({
    comissaoPercentual: atualizado.comissaoPercentual !== null ? Number(atualizado.comissaoPercentual) : null,
  });
}
