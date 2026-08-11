import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { CamposEvento, validarCamposEvento } from "@/lib/validarEvento";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
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
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  try {
    await prisma.evento.delete({ where: { id: params.eventoId } });
  } catch (erro) {
    // Pedido.evento usa onDelete: Restrict — o banco recusa apagar um evento
    // que já tem pedidos reais (pagos de verdade), de propósito. O Postgres sinaliza
    // isso com o SQLSTATE 23001 (restrict_violation), que o Prisma NÃO mapeia pro
    // P2003 conhecido (esse é reservado pro 23503 padrão) — por isso checamos as
    // duas formas: o erro tipado E o erro "desconhecido" com esse código cru.
    const ehViolacaoRestrict =
      (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") ||
      (erro instanceof Prisma.PrismaClientUnknownRequestError && erro.message.includes("23001"));
    if (ehViolacaoRestrict) {
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
