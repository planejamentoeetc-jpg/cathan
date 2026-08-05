/**
 * Heurística de MVP (sem fila de produção real ainda): tempo médio de
 * preparo dos produtos ativos do quiosque × quantidade de sub-pedidos
 * ainda não retirados/cancelados. Será substituída por uma fila real
 * quando o painel do quiosque existir.
 */
export function calcularEsperaEstimadaMinutos(
  tempoProducaoProdutosAtivos: number[],
  subPedidosAtivosCount: number
): number {
  if (subPedidosAtivosCount === 0 || tempoProducaoProdutosAtivos.length === 0) {
    return 0;
  }

  const tempoMedio =
    tempoProducaoProdutosAtivos.reduce((soma, t) => soma + t, 0) /
    tempoProducaoProdutosAtivos.length;

  return Math.round(tempoMedio * subPedidosAtivosCount);
}

export function formatarEspera(minutos: number): string {
  return minutos <= 0 ? "Sem espera" : `~${minutos} min de espera`;
}
