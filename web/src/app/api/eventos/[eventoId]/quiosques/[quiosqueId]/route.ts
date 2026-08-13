import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CamposQuiosque, validarCamposQuiosque } from "@/lib/validarQuiosque";
import { ehViolacaoRestrict } from "@/lib/erroRestrict";

type CorpoRequisicao = CamposQuiosque & {
  dica?: string | null;
  mensagemPreparando?: string | null;
  mensagemPronto?: string | null;
  combinaComId?: string | null;
};

function normalizar(valor: string | null | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const resultado = validarCamposQuiosque(corpo);
  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  }

  const combinaComId = normalizar(corpo.combinaComId);
  if (combinaComId) {
    const parceiro = await prisma.quiosque.findUnique({ where: { id: combinaComId } });
    if (!parceiro || parceiro.eventoId !== quiosque.eventoId || parceiro.id === quiosque.id) {
      return NextResponse.json({ erro: "Quiosque parceiro inválido." }, { status: 400 });
    }
  }

  const atualizado = await prisma.quiosque.update({
    where: { id: quiosque.id },
    data: {
      ...resultado.dados,
      dica: normalizar(corpo.dica),
      mensagemPreparando: normalizar(corpo.mensagemPreparando),
      mensagemPronto: normalizar(corpo.mensagemPronto),
      combinaComId,
    },
  });

  return NextResponse.json({ id: atualizado.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  try {
    await prisma.quiosque.delete({ where: { id: quiosque.id } });
  } catch (erro) {
    if (ehViolacaoRestrict(erro)) {
      return NextResponse.json(
        {
          erro:
            "Não é possível excluir este quiosque porque ele já tem pedidos pagos registrados. " +
            "Quiosques com vendas reais ficam guardados por segurança.",
        },
        { status: 409 }
      );
    }
    throw erro;
  }

  return NextResponse.json({ ok: true });
}
