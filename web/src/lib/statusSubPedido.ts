import { StatusSubPedido } from "@prisma/client";

/** Estados que ainda ocupam a fila (não retirados/concluídos/cancelados). */
export const STATUS_ATIVOS: StatusSubPedido[] = [
  StatusSubPedido.RECEBIDO,
  StatusSubPedido.ACEITO,
  StatusSubPedido.EM_PRODUCAO,
  StatusSubPedido.PRONTO,
  StatusSubPedido.CHAMADO,
  StatusSubPedido.APROVEITANDO,
];

/** Estados que merecem destaque visual forte (prontos pra ação do cliente). */
export const STATUS_DESTAQUE: StatusSubPedido[] = [
  StatusSubPedido.PRONTO,
  StatusSubPedido.CHAMADO,
];

export const STATUS_LABEL: Record<StatusSubPedido, string> = {
  RECEBIDO: "Recebido",
  ACEITO: "Aceito",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto para retirada",
  RETIRADO: "Retirado",
  CHAMADO: "Chamado",
  APROVEITANDO: "Aproveitando",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};
