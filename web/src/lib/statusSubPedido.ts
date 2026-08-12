import { ModalidadeQuiosque, StatusSubPedido } from "@prisma/client";

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

/** Sequência de etapas visíveis pro cliente, na ordem — muda conforme a modalidade do quiosque. */
export function etapasStatus(modalidade: ModalidadeQuiosque | string): StatusSubPedido[] {
  if (modalidade === ModalidadeQuiosque.BRINCADEIRAS) {
    return [
      StatusSubPedido.RECEBIDO,
      StatusSubPedido.CHAMADO,
      StatusSubPedido.APROVEITANDO,
      StatusSubPedido.CONCLUIDO,
    ];
  }
  return [
    StatusSubPedido.RECEBIDO,
    StatusSubPedido.ACEITO,
    StatusSubPedido.EM_PRODUCAO,
    StatusSubPedido.PRONTO,
    StatusSubPedido.RETIRADO,
  ];
}

/** Rótulo curto pra caber embaixo da bolinha do stepper (etapasStatus usa nomes mais longos). */
export const STATUS_ROTULO_CURTO: Record<StatusSubPedido, string> = {
  RECEBIDO: "Enviado",
  ACEITO: "Aceito",
  EM_PRODUCAO: "Preparando",
  PRONTO: "Pronto",
  RETIRADO: "Retirado",
  CHAMADO: "Chamado",
  APROVEITANDO: "Aproveitando",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const STATUS_ICONE: Record<StatusSubPedido, string> = {
  RECEBIDO: "📨",
  ACEITO: "👍",
  EM_PRODUCAO: "🔥",
  PRONTO: "🎉",
  RETIRADO: "✅",
  CHAMADO: "📣",
  APROVEITANDO: "🎈",
  CONCLUIDO: "✅",
  CANCELADO: "✕",
};

/**
 * Frase amigável explicando o que está acontecendo agora — o cliente não deveria
 * nunca ficar sem saber o que o status técnico ("Aceito", "Em produção") significa
 * na prática. Mensagens customizadas do quiosque (mensagemPreparando/mensagemPronto)
 * têm prioridade sobre o texto padrão quando fazem sentido pra etapa.
 */
export function mensagemAmigavel(params: {
  status: StatusSubPedido;
  modalidade: ModalidadeQuiosque | string;
  vocEProximo?: boolean;
  mensagemPreparando?: string | null;
  mensagemPronto?: string | null;
}): string {
  const { status, modalidade, vocEProximo, mensagemPreparando, mensagemPronto } = params;
  const brincadeira = modalidade === ModalidadeQuiosque.BRINCADEIRAS;

  if (vocEProximo) {
    return (
      mensagemPreparando ?? (brincadeira ? "Você é o próximo! Já já é sua vez." : "Já vamos preparar o seu!")
    );
  }

  if (brincadeira) {
    switch (status) {
      case StatusSubPedido.RECEBIDO:
        return "Pedido enviado! Aguardando sua vez na fila.";
      case StatusSubPedido.CHAMADO:
        return mensagemPronto ?? "Chegou sua vez! Vá até o quiosque.";
      case StatusSubPedido.APROVEITANDO:
        return "Aproveitando agora — bom divertimento!";
      case StatusSubPedido.CONCLUIDO:
        return "Concluído. Esperamos que tenha gostado!";
      case StatusSubPedido.CANCELADO:
        return "Esse pedido foi cancelado.";
      default:
        return STATUS_LABEL[status];
    }
  }

  switch (status) {
    case StatusSubPedido.RECEBIDO:
      return "Pedido enviado! Aguardando o quiosque aceitar.";
    case StatusSubPedido.ACEITO:
      return mensagemPreparando ?? "Aceito! Já vamos começar a preparar.";
    case StatusSubPedido.EM_PRODUCAO:
      return mensagemPreparando ?? "Sendo preparado agora — não demora!";
    case StatusSubPedido.PRONTO:
      return mensagemPronto ?? "Pronto! Pode vir buscar.";
    case StatusSubPedido.RETIRADO:
      return "Retirado. Bom apetite!";
    case StatusSubPedido.CANCELADO:
      return "Esse pedido foi cancelado.";
    default:
      return STATUS_LABEL[status];
  }
}
