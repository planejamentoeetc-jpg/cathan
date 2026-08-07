export type CamposProduto = {
  nome: string;
  preco: number;
  tempoProducaoMinutos: number;
  estoque: number | null;
};

export function validarCamposProduto(corpo: Partial<CamposProduto>): string | null {
  if (!corpo.nome?.trim()) return "Informe o nome do produto.";
  if (typeof corpo.preco !== "number" || !(corpo.preco > 0)) return "Informe um preço válido.";
  if (!Number.isInteger(corpo.tempoProducaoMinutos) || corpo.tempoProducaoMinutos! < 0) {
    return "Tempo de produção/duração inválido.";
  }
  if (corpo.estoque !== null && (!Number.isInteger(corpo.estoque) || corpo.estoque! < 0)) {
    return "Estoque inválido.";
  }
  return null;
}
