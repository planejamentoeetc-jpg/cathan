import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposProduto, validarCamposProduto } from "@/lib/validarProduto";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

export async function POST(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

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
