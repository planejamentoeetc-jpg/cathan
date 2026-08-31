import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposProduto, validarCamposProduto } from "@/lib/validarProduto";
import { ehViolacaoRestrict } from "@/lib/erroRestrict";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

export async function PATCH(req: NextRequest, { params }: { params: { produtoId: string } }) {
  const produto = await prisma.produto.findUnique({
    where: { id: params.produtoId },
    include: { quiosque: { select: { id: true, tipo: true, senhaHash: true } } },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, produto.quiosque);
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

  const atualizado = await prisma.produto.update({
    where: { id: params.produtoId },
    data: {
      nome: corpo.nome.trim(),
      preco: corpo.preco,
      tempoProducaoMinutos: corpo.tempoProducaoMinutos,
      estoque: corpo.estoque,
    },
  });

  return NextResponse.json({ id: atualizado.id });
}

export async function DELETE(req: NextRequest, { params }: { params: { produtoId: string } }) {
  const produto = await prisma.produto.findUnique({
    where: { id: params.produtoId },
    include: { quiosque: { select: { id: true, tipo: true, senhaHash: true } } },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, produto.quiosque);
  if (bloqueado) return bloqueado;

  try {
    await prisma.produto.delete({ where: { id: params.produtoId } });
  } catch (erro) {
    if (ehViolacaoRestrict(erro)) {
      return NextResponse.json(
        {
          erro:
            "Não é possível excluir — esse produto já tem pedidos registrados. Use \"Esgotar\" " +
            "pra escondê-lo do cardápio sem perder o histórico de vendas.",
        },
        { status: 409 }
      );
    }
    throw erro;
  }

  return NextResponse.json({ ok: true });
}
