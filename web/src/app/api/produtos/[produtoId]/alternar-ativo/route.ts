import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { produtoId: string } }) {
  const produto = await prisma.produto.findUnique({ where: { id: params.produtoId } });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.produto.update({
    where: { id: params.produtoId },
    data: { ativo: !produto.ativo },
  });

  return NextResponse.json({ id: atualizado.id, ativo: atualizado.ativo });
}
