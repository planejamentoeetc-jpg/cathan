import { prisma } from "@/lib/prisma";
import { SegmentoGrafico, LinhaSla } from "@/lib/analytics";

const STATUS_ALIMENTACAO = ["RECEBIDO", "ACEITO", "EM_PRODUCAO", "PRONTO", "RETIRADO"] as const;
const LABEL_ALIMENTACAO: Record<string, string> = {
  RECEBIDO: "Recebido",
  ACEITO: "Aceito",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  RETIRADO: "Retirado",
};

const STATUS_BRINCADEIRAS = ["RECEBIDO", "CHAMADO", "APROVEITANDO", "CONCLUIDO"] as const;
const LABEL_BRINCADEIRAS: Record<string, string> = {
  RECEBIDO: "Recebido",
  CHAMADO: "Chamado",
  APROVEITANDO: "Aproveitando",
  CONCLUIDO: "Concluído",
};

export type AnalyticsQuiosque = {
  vendasTotal: number;
  totalPedidos: number;
  vendasPorForma: { mercadoPago: number; dinheiro: number };
  ticketMedio: number | null;
  prazoPct: number | null;
  tempoMedioProducaoMin: number | null;
  produtoCampeao: { nome: string; quantidade: number } | null;
  topProdutos: SegmentoGrafico[];
  funil: SegmentoGrafico[];
  ehBrincadeiras: boolean;
  slaLinhas: LinhaSla[];
};

// Mesma lógica de lib/analytics.ts, só que a partir do SubPedido (raiz natural
// de "vendas deste quiosque") em vez do Pedido (que pode misturar quiosques) --
// evita reescrever calcularAnalyticsEvento pra aceitar um filtro que a maioria
// dos usos (admin/gestor, evento inteiro) nunca precisa.
export async function calcularAnalyticsQuiosque(quiosqueId: string): Promise<AnalyticsQuiosque> {
  const quiosque = await prisma.quiosque.findUnique({
    where: { id: quiosqueId },
    select: { cor: true, modalidade: true },
  });

  const subPedidos = await prisma.subPedido.findMany({
    where: { quiosqueId },
    include: {
      pedido: { select: { formaPagamento: true, cliente: { select: { nome: true } } } },
      itens: { include: { produto: { select: { nome: true, tempoProducaoMinutos: true } } } },
    },
  });

  const ehBrincadeiras = quiosque?.modalidade === "BRINCADEIRAS";
  const cor = quiosque?.cor ?? "#333";

  let vendasTotal = 0;
  const vendasPorForma = { mercadoPago: 0, dinheiro: 0 };
  const quantidadePorProduto = new Map<string, { nome: string; quantidade: number }>();
  const funilCount = new Map<string, number>();
  const concluidos: { decorridoMin: number; prazoMin: number }[] = [];
  const slaLinhas: LinhaSla[] = [];

  for (const sp of subPedidos) {
    const valorSub = sp.itens.reduce((soma, item) => soma + Number(item.precoUnitario) * item.quantidade, 0);
    vendasTotal += valorSub;
    if (sp.pedido.formaPagamento === "DINHEIRO") vendasPorForma.dinheiro += valorSub;
    else vendasPorForma.mercadoPago += valorSub;

    for (const item of sp.itens) {
      const atual = quantidadePorProduto.get(item.produtoId) ?? { nome: item.produto.nome, quantidade: 0 };
      atual.quantidade += item.quantidade;
      quantidadePorProduto.set(item.produtoId, atual);
    }

    funilCount.set(sp.status, (funilCount.get(sp.status) ?? 0) + 1);

    if (!ehBrincadeiras && sp.aceitoEm) {
      const prazoMin = Math.max(...sp.itens.map((i) => i.produto.tempoProducaoMinutos), 1);
      const fim = sp.prontoEm ?? new Date();
      const decorridoMin = (fim.getTime() - sp.aceitoEm.getTime()) / 60000;
      const noPrazo = decorridoMin <= prazoMin;

      if (sp.prontoEm) {
        concluidos.push({ decorridoMin, prazoMin });
      }

      slaLinhas.push({
        codigoRetirada: sp.codigoRetirada,
        quiosqueNome: "",
        clienteNome: sp.pedido.cliente.nome,
        decorridoMin,
        prazoMin,
        noPrazo,
        finalizado: Boolean(sp.prontoEm),
      });
    }
  }

  const produtosOrdenados = [...quantidadePorProduto.values()].sort((a, b) => b.quantidade - a.quantidade);
  const produtoCampeao = produtosOrdenados[0]
    ? { nome: produtosOrdenados[0].nome, quantidade: produtosOrdenados[0].quantidade }
    : null;
  const topProdutos: SegmentoGrafico[] = produtosOrdenados.slice(0, 5).map((p) => ({
    label: p.nome,
    valor: p.quantidade,
    cor,
    texto: `${p.quantidade} un.`,
  }));

  const okConcl = concluidos.filter((c) => c.decorridoMin <= c.prazoMin);
  const prazoPct = concluidos.length > 0 ? Math.round((okConcl.length / concluidos.length) * 100) : null;
  const tempoMedioProducaoMin =
    concluidos.length > 0 ? concluidos.reduce((s, c) => s + c.decorridoMin, 0) / concluidos.length : null;

  const status = ehBrincadeiras ? STATUS_BRINCADEIRAS : STATUS_ALIMENTACAO;
  const labels = ehBrincadeiras ? LABEL_BRINCADEIRAS : LABEL_ALIMENTACAO;

  return {
    vendasTotal,
    totalPedidos: subPedidos.length,
    vendasPorForma,
    ticketMedio: subPedidos.length > 0 ? vendasTotal / subPedidos.length : null,
    prazoPct,
    tempoMedioProducaoMin,
    produtoCampeao,
    topProdutos,
    funil: status.map((s) => ({
      label: labels[s],
      valor: funilCount.get(s) ?? 0,
      cor: ehBrincadeiras ? "#FF7A45" : "#1E8E5A",
    })),
    ehBrincadeiras,
    slaLinhas,
  };
}
