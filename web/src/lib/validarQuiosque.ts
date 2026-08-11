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
  if (tipo === TipoQuiosque.INDEPENDENTE && (!corpo.cnpj?.trim() || !corpo.chavePix?.trim())) {
    return { erro: "Quiosque independente precisa de CNPJ/CPF e chave PIX de recebimento." };
  }

  return {
    dados: {
      nome: corpo.nome.trim(),
      modalidade: corpo.modalidade,
      tipo,
      cnpj: tipo === TipoQuiosque.INDEPENDENTE ? corpo.cnpj!.trim() : null,
      chavePix: tipo === TipoQuiosque.INDEPENDENTE ? corpo.chavePix!.trim() : null,
    },
  };
}
