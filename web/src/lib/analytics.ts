import { StatusSubPedido } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TAXA_CATHAN = 0.049; // 4,9% — comissão de marketplace, percentual de teste

const STATUS_ALIMENTACAO = [
  StatusSubPedido.RECEBIDO,
  StatusSubPedido.ACEITO,
  StatusSubPedido.EM_PRODUCAO,
  StatusSubPedido.PRONTO,
  StatusSubPedido.RETIRADO,
] as const;

const LABEL_ALIMENTACAO: Record<string, string> = {
  RECEBIDO: "Recebido",
  ACEITO: "Aceito",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  RETIRADO: "Retirado",
};

const STATUS_BRINCADEIRAS = [
  StatusSubPedido.RECEBIDO,
  StatusSubPedido.CHAMADO,
  StatusSubPedido.APROVEITANDO,
  StatusSubPedido.CONCLUIDO,
] as const;

const LABEL_BRINCADEIRAS: Record<string, string> = {
  RECEBIDO: "Recebido",
  CHAMADO: "Chamado",
  APROVEITANDO: "Aproveitando",
  CONCLUIDO: "Concluído",
};

export type SegmentoGrafico = { label: string; valor: number; cor: string; texto?: string };
export type LinhaSla = {
  codigoRetirada: string;
  quiosqueNome: string;
  clienteNome: string;
  decorridoMin: number;
  prazoMin: number;
  noPrazo: boolean;
  finalizado: boolean;
};

export type AnalyticsEvento = {
  vendasTotal: number;
  totalPedidos: number;
  vendasPorForma: { mercadoPago: number; dinheiro: number };
  vendasPorQuiosque: SegmentoGrafico[];
  ticketMedio: number | null;
  prazoPct: number | null;
  tempoMedioProducaoMin: number | null;
  produtoCampeao: { nome: string; quantidade: number } | null;
  topProdutos: SegmentoGrafico[];
  funilAlimentacao: SegmentoGrafico[];
  funilBrincadeiras: SegmentoGrafico[];
  temBrincadeiras: boolean;
  tempoPorQuiosque: SegmentoGrafico[];
  slaLinhas: LinhaSla[];
};

export async function calcularAnalyticsEvento(eventoId: string): Promise<AnalyticsEvento> {
  const [pedidos, quiosques] = await Promise.all([
    prisma.pedido.findMany({
      where: { eventoId },
      include: {
        cliente: { select: { nome: true } },
        subPedidos: {
          include: {
            quiosque: { select: { id: true, nome: true, cor: true, modalidade: true } },
            itens: { include: { produto: { select: { nome: true, tempoProducaoMinutos: true } } } },
          },
        },
      },
    }),
    prisma.quiosque.findMany({ where: { eventoId }, select: { id: true, nome: true, cor: true, modalidade: true } }),
  ]);

  let vendasTotal = 0;
  const vendasPorForma = { mercadoPago: 0, dinheiro: 0 };
  const vendasPorQuiosqueMap = new Map<string, number>();
  const quantidadePorProduto = new Map<string, { nome: string; quantidade: number; cor: string }>();
  const funilAlimentacaoCount = new Map<string, number>();
  const funilBrincadeirasCount = new Map<string, number>();
  const concluidosAlimentacao: { quiosqueId: string; decorridoMin: number; prazoMin: number }[] = [];
  const slaLinhas: LinhaSla[] = [];

  for (const pedido of pedidos) {
    for (const subPedido of pedido.subPedidos) {
      const valorSub = subPedido.itens.reduce(
        (soma, item) => soma + Number(item.precoUnitario) * item.quantidade,
        0
      );
      vendasTotal += valorSub;
      if (pedido.formaPagamento === "DINHEIRO") vendasPorForma.dinheiro += valorSub;
      else vendasPorForma.mercadoPago += valorSub;

      vendasPorQuiosqueMap.set(
        subPedido.quiosqueId,
        (vendasPorQuiosqueMap.get(subPedido.quiosqueId) ?? 0) + valorSub
      );

      for (const item of subPedido.itens) {
        const atual = quantidadePorProduto.get(item.produtoId) ?? {
          nome: item.produto.nome,
          quantidade: 0,
          cor: subPedido.quiosque.cor,
        };
        atual.quantidade += item.quantidade;
        quantidadePorProduto.set(item.produtoId, atual);
      }

      const ehBrincadeira = subPedido.quiosque.modalidade === "BRINCADEIRAS";
      if (ehBrincadeira) {
        funilBrincadeirasCount.set(subPedido.status, (funilBrincadeirasCount.get(subPedido.status) ?? 0) + 1);
      } else {
        funilAlimentacaoCount.set(subPedido.status, (funilAlimentacaoCount.get(subPedido.status) ?? 0) + 1);

        if (subPedido.aceitoEm) {
          const prazoMin = Math.max(...subPedido.itens.map((i) => i.produto.tempoProducaoMinutos), 1);
          const fim = subPedido.prontoEm ?? new Date();
          const decorridoMin = (fim.getTime() - subPedido.aceitoEm.getTime()) / 60000;
          const noPrazo = decorridoMin <= prazoMin;

          if (subPedido.prontoEm) {
            concluidosAlimentacao.push({ quiosqueId: subPedido.quiosqueId, decorridoMin, prazoMin });
          }

          slaLinhas.push({
            codigoRetirada: subPedido.codigoRetirada,
            quiosqueNome: subPedido.quiosque.nome,
            clienteNome: pedido.cliente.nome,
            decorridoMin,
            prazoMin,
            noPrazo,
            finalizado: Boolean(subPedido.prontoEm),
          });
        }
      }
    }
  }

  const vendasPorQuiosque: SegmentoGrafico[] = quiosques.map((q) => ({
    label: q.nome,
    valor: vendasPorQuiosqueMap.get(q.id) ?? 0,
    cor: q.cor,
  }));

  const produtosOrdenados = [...quantidadePorProduto.values()].sort((a, b) => b.quantidade - a.quantidade);
  const produtoCampeao = produtosOrdenados[0]
    ? { nome: produtosOrdenados[0].nome, quantidade: produtosOrdenados[0].quantidade }
    : null;
  const topProdutos: SegmentoGrafico[] = produtosOrdenados.slice(0, 5).map((p) => ({
    label: p.nome,
    valor: p.quantidade,
    cor: p.cor,
    texto: `${p.quantidade} un.`,
  }));

  const okConcl = concluidosAlimentacao.filter((c) => c.decorridoMin <= c.prazoMin);
  const prazoPct =
    concluidosAlimentacao.length > 0
      ? Math.round((okConcl.length / concluidosAlimentacao.length) * 100)
      : null;
  const tempoMedioProducaoMin =
    concluidosAlimentacao.length > 0
      ? concluidosAlimentacao.reduce((s, c) => s + c.decorridoMin, 0) / concluidosAlimentacao.length
      : null;

  const tempoPorQuiosque = quiosques
    .filter((q) => q.modalidade !== "BRINCADEIRAS")
    .map((q): SegmentoGrafico | null => {
      const doQuiosque = concluidosAlimentacao.filter((c) => c.quiosqueId === q.id);
      if (doQuiosque.length === 0) return null;
      const realMin = doQuiosque.reduce((s, c) => s + c.decorridoMin, 0) / doQuiosque.length;
      const prazoMin = doQuiosque.reduce((s, c) => s + c.prazoMin, 0) / doQuiosque.length;
      return {
        label: q.nome,
        valor: realMin,
        cor: realMin <= prazoMin ? "#1E8E5A" : "#D93025",
        texto: `${formatarMinutos(realMin)} / ${formatarMinutos(prazoMin)}`,
      };
    })
    .filter((v): v is SegmentoGrafico => v !== null);

  return {
    vendasTotal,
    totalPedidos: pedidos.length,
    vendasPorForma,
    vendasPorQuiosque,
    ticketMedio: pedidos.length > 0 ? vendasTotal / pedidos.length : null,
    prazoPct,
    tempoMedioProducaoMin,
    produtoCampeao,
    topProdutos,
    funilAlimentacao: STATUS_ALIMENTACAO.map((status) => ({
      label: LABEL_ALIMENTACAO[status],
      valor: funilAlimentacaoCount.get(status) ?? 0,
      cor: "#1E8E5A",
    })),
    funilBrincadeiras: STATUS_BRINCADEIRAS.map((status) => ({
      label: LABEL_BRINCADEIRAS[status],
      valor: funilBrincadeirasCount.get(status) ?? 0,
      cor: "#FF7A45",
    })),
    temBrincadeiras: quiosques.some((q) => q.modalidade === "BRINCADEIRAS"),
    tempoPorQuiosque,
    slaLinhas,
  };
}

export function formatarMinutos(min: number): string {
  if (min < 1) return `${Math.round(min * 60)} s`;
  return `${min.toFixed(1)} min`;
}
