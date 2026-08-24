const MODALIDADES_VALIDAS = ["ORGANIZADOR_UNICO", "MULTI_ESTABELECIMENTO"] as const;
export type ModalidadeEventoValidada = (typeof MODALIDADES_VALIDAS)[number];

export type CamposEvento = {
  nome: string;
  local: string;
  data: string;
  raioPedidosMetros?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  // só relevante na CRIAÇÃO (POST) -- na edição (PATCH) o formulário não manda
  // esse campo, então fica undefined e o update não toca nele (é uma escolha
  // de uma vez só, feita ao criar o evento, não algo pra mudar depois)
  modalidade?: string;
};

export type EventoValidado = {
  nome: string;
  local: string;
  data: Date;
  raioPedidosMetros: number | null;
  latitude: number | null;
  longitude: number | null;
  modalidade?: ModalidadeEventoValidada;
};

export function validarCamposEvento(
  corpo: Partial<CamposEvento>
): { erro: string } | { dados: EventoValidado } {
  if (!corpo.nome?.trim() || !corpo.local?.trim() || !corpo.data) {
    return { erro: "Informe nome, local e data do evento." };
  }

  const data = new Date(corpo.data);
  if (Number.isNaN(data.getTime())) {
    return { erro: "Data do evento inválida." };
  }

  // geofencing é tudo-ou-nada: raio junto com lat/long, ou nenhum dos três (ver CHECK no banco)
  const temRaio = corpo.raioPedidosMetros !== null && corpo.raioPedidosMetros !== undefined;
  const temCoordenadas =
    typeof corpo.latitude === "number" && typeof corpo.longitude === "number";

  if (temRaio !== temCoordenadas) {
    return { erro: "Raio de geofencing e localização (latitude/longitude) devem ser definidos juntos." };
  }
  if (temRaio && (!Number.isInteger(corpo.raioPedidosMetros) || (corpo.raioPedidosMetros as number) <= 0)) {
    return { erro: "Raio de geofencing deve ser um número inteiro maior que zero." };
  }

  if (
    corpo.modalidade !== undefined &&
    !MODALIDADES_VALIDAS.includes(corpo.modalidade as ModalidadeEventoValidada)
  ) {
    return { erro: "Modalidade de evento inválida." };
  }

  return {
    dados: {
      nome: corpo.nome.trim(),
      local: corpo.local.trim(),
      data,
      raioPedidosMetros: temRaio ? (corpo.raioPedidosMetros as number) : null,
      latitude: temCoordenadas ? (corpo.latitude as number) : null,
      longitude: temCoordenadas ? (corpo.longitude as number) : null,
      ...(corpo.modalidade !== undefined
        ? { modalidade: corpo.modalidade as ModalidadeEventoValidada }
        : {}),
    },
  };
}
