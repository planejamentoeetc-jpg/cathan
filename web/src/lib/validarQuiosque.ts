import { ModalidadeQuiosque, TipoQuiosque } from "@prisma/client";

export type CamposQuiosque = {
  nome: string;
  modalidade: ModalidadeQuiosque;
  tipo?: TipoQuiosque;
  cnpj?: string;
  chavePix?: string;
};

export type QuiosqueValidado = {
  nome: string;
  modalidade: ModalidadeQuiosque;
  tipo: TipoQuiosque;
  cnpj: string | null;
  chavePix: string | null;
};

export function validarCamposQuiosque(
  corpo: Partial<CamposQuiosque>
): { erro: string } | { dados: QuiosqueValidado } {
  if (!corpo.nome?.trim()) {
    return { erro: "Informe o nome do quiosque." };
  }
  if (!corpo.modalidade || !Object.values(ModalidadeQuiosque).includes(corpo.modalidade)) {
    return { erro: "Modalidade inválida." };
  }

  const tipo = corpo.tipo ?? TipoQuiosque.DO_EVENTO;
  if (!Object.values(TipoQuiosque).includes(tipo)) {
    return { erro: "Tipo de quiosque inválido." };
  }

  // CNPJ/chave PIX são opcionais mesmo pra INDEPENDENTE -- a conexão real de
  // pagamento é feita via OAuth do Mercado Pago (mpAccessTokenCifrado), não
  // por esses campos. Ficam só como informação de referência do gestor,
  // preenchíveis a qualquer momento na tela do quiosque.
  const cnpj = corpo.cnpj?.trim() || null;
  const chavePix = corpo.chavePix?.trim() || null;

  return {
    dados: {
      nome: corpo.nome.trim(),
      modalidade: corpo.modalidade,
      tipo,
      cnpj: tipo === TipoQuiosque.INDEPENDENTE ? cnpj : null,
      chavePix: tipo === TipoQuiosque.INDEPENDENTE ? chavePix : null,
    },
  };
}
