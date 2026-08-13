import { NextRequest, NextResponse } from "next/server";
import { CamposEvento, validarCamposEvento } from "@/lib/validarEvento";
import { prisma } from "@/lib/prisma";
import { ehViolacaoRestrict } from "@/lib/erroRestrict";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
  });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  let corpo: CamposEvento;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const resultado = validarCamposEvento(corpo);
  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  }

  const atualizado = await prisma.evento.update({
    where: { id: params.eventoId },
    data: resultado.dados,
  });

  return NextResponse.json({ id: atualizado.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
  });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  try {
    await prisma.evento.delete({ where: { id: params.eventoId } });
  } catch (erro) {
    if (ehViolacaoRestrict(erro)) {
      return NextResponse.json(
        {
          erro:
            "Não é possível excluir este evento porque ele já tem pedidos pagos registrados. " +
            "Eventos com vendas reais ficam guardados por segurança.",
        },
        { status: 409 }
      );
    }
    throw erro;
  }

  return NextResponse.json({ ok: true });
}
