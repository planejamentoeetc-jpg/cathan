import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

export async function POST(
  _req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string; produtoId: string } }
) {
  const produto = await prisma.produto.findFirst({
    where: {
      id: params.produtoId,
      quiosqueId: params.quiosqueId,
      quiosque: { eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
    },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const atualizado = await prisma.produto.update({
    where: { id: produto.id },
    data: { ativo: !produto.ativo },
  });

  return NextResponse.json({ id: atualizado.id, ativo: atualizado.ativo });
}
