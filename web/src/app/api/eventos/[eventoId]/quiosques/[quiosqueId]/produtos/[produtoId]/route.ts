import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposProduto, validarCamposProduto } from "@/lib/validarProduto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string; produtoId: string } }
) {
  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, quiosqueId: params.quiosqueId, quiosque: { eventoId: params.eventoId } },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  let corpo: CamposProduto;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const erro = validarCamposProduto(corpo);
  if (erro) {
    return NextResponse.json({ erro }, { status: 400 });
  }

  const atualizado = await prisma.produto.update({
    where: { id: produto.id },
    data: {
      nome: corpo.nome.trim(),
      preco: corpo.preco,
      tempoProducaoMinutos: corpo.tempoProducaoMinutos,
      estoque: corpo.estoque,
    },
  });

  return NextResponse.json({ id: atualizado.id });
}
