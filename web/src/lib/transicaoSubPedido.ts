import { ModalidadeQuiosque, StatusSubPedido } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CampoTimestamp =
  | "aceitoEm"
  | "prontoEm"
  | "retiradoEm"
  | "chamadoEm"
  | "inicioAproveitamentoEm"
  | "concluidoEm";

type Opcoes = {
  subPedidoId: string;
  modalidadesPermitidas: ModalidadeQuiosque[];
  statusEsperado: StatusSubPedido;
  novoStatus: StatusSubPedido;
  campoTimestamp: CampoTimestamp;
};

/** Valida quiosque/status e aplica uma transição de status, com o timestamp correspondente. */
export async function transicionarSubPedido(opcoes: Opcoes) {
  const subPedido = await prisma.subPedido.findUnique({
    where: { id: opcoes.subPedidoId },
    include: { quiosque: { select: { modalidade: true } } },
  });

  if (!subPedido) {
    return NextResponse.json({ erro: "Sub-pedido não encontrado." }, { status: 404 });
  }
  if (!opcoes.modalidadesPermitidas.includes(subPedido.quiosque.modalidade)) {
    return NextResponse.json(
      { erro: `Esta ação não se aplica a um quiosque de modalidade ${subPedido.quiosque.modalidade}.` },
      { status: 400 }
    );
  }
  if (subPedido.status !== opcoes.statusEsperado) {
    return NextResponse.json(
      { erro: `Não é possível fazer essa transição a partir do status ${subPedido.status}.` },
      { status: 409 }
    );
  }

  const atualizado = await prisma.subPedido.update({
    where: { id: opcoes.subPedidoId },
    data: { status: opcoes.novoStatus, [opcoes.campoTimestamp]: new Date() },
  });

  return NextResponse.json({ id: atualizado.id, status: atualizado.status });
}
