import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposProduto, validarCamposProduto } from "@/lib/validarProduto";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
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

  const produto = await prisma.produto.create({
    data: {
      quiosqueId: quiosque.id,
      nome: corpo.nome.trim(),
      preco: corpo.preco,
      tempoProducaoMinutos: corpo.tempoProducaoMinutos,
      estoque: corpo.estoque,
    },
  });

  return NextResponse.json({ id: produto.id }, { status: 201 });
}
