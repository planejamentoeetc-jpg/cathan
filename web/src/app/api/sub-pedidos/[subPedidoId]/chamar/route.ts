import { ModalidadeQuiosque, StatusSubPedido } from "@prisma/client";
import { NextRequest } from "next/server";
import { transicionarSubPedido } from "@/lib/transicaoSubPedido";

export async function POST(_req: NextRequest, { params }: { params: { subPedidoId: string } }) {
  return transicionarSubPedido({
    subPedidoId: params.subPedidoId,
    modalidadesPermitidas: [ModalidadeQuiosque.BRINCADEIRAS],
    statusEsperado: StatusSubPedido.RECEBIDO,
    novoStatus: StatusSubPedido.CHAMADO,
    campoTimestamp: "chamadoEm",
  });
}
