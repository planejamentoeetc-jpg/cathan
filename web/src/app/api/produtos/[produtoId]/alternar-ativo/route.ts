import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

export async function POST(req: NextRequest, { params }: { params: { produtoId: string } }) {
  const produto = await prisma.produto.findUnique({
    where: { id: params.produtoId },
    include: { quiosque: { select: { id: true, tipo: true, senhaHash: true } } },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, produto.quiosque);
  if (bloqueado) return bloqueado;

  const atualizado = await prisma.produto.update({
    where: { id: params.produtoId },
    data: { ativo: !produto.ativo },
  });

  return NextResponse.json({ id: atualizado.id, ativo: atualizado.ativo });
}
