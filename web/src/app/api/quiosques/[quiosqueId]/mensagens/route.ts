import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

type CorpoRequisicao = {
  dica?: string | null;
  mensagemPreparando?: string | null;
  mensagemPronto?: string | null;
  combinaComId?: string | null;
};

function normalizar(valor: string | null | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const combinaComId = normalizar(corpo.combinaComId);
  if (combinaComId) {
    const parceiro = await prisma.quiosque.findUnique({ where: { id: combinaComId } });
    if (!parceiro || parceiro.eventoId !== quiosque.eventoId || parceiro.id === quiosque.id) {
      return NextResponse.json({ erro: "Quiosque parceiro inválido." }, { status: 400 });
    }
  }

  const atualizado = await prisma.quiosque.update({
    where: { id: params.quiosqueId },
    data: {
      dica: normalizar(corpo.dica),
      mensagemPreparando: normalizar(corpo.mensagemPreparando),
      mensagemPronto: normalizar(corpo.mensagemPronto),
      combinaComId,
    },
  });

  return NextResponse.json({
    dica: atualizado.dica,
    mensagemPreparando: atualizado.mensagemPreparando,
    mensagemPronto: atualizado.mensagemPronto,
    combinaComId: atualizado.combinaComId,
  });
}
