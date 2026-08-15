import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";

export async function GET(_req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({
    where: { id: params.quiosqueId },
    select: { id: true, nome: true, modalidade: true },
  });

  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  const subPedidos = await prisma.subPedido.findMany({
    where: { quiosqueId: params.quiosqueId, status: { in: STATUS_ATIVOS } },
    orderBy: { criadoEm: "asc" },
    include: {
      pedido: { include: { cliente: { select: { nome: true } } } },
      itens: { include: { produto: { select: { nome: true, tempoProducaoMinutos: true } } } },
    },
  });

  return NextResponse.json({
    quiosque,
    // itens ainda não liberados pelo cliente ("compra em massa" segurada) nem entram
    // aqui — o quiosque não vê nada até o cliente mandar pra produção. Um sub-pedido
    // sem nenhuma unidade liberada some da fila inteiro.
    pedidos: subPedidos
      .map((sp) => ({ ...sp, itensLiberados: sp.itens.filter((item) => item.quantidadeLiberada > 0) }))
      .filter((sp) => sp.itensLiberados.length > 0)
      .map((sp) => {
        const nomesCriancas = sp.itensLiberados.flatMap((item) => item.nomesCriancas);
        // sessão dura o tempo da atividade mais longa entre os itens liberados do sub-pedido
        const duracaoMinutos = Math.max(0, ...sp.itensLiberados.map((item) => item.produto.tempoProducaoMinutos));

        return {
          id: sp.id,
          status: sp.status,
          codigoRetirada: sp.codigoRetirada,
          rodada: sp.rodada,
          criadoEm: sp.criadoEm,
          clienteNome: sp.pedido.cliente.nome,
          clienteACaminho: sp.clienteACaminhoEm !== null,
          nomesCriancas,
          duracaoMinutos,
          inicioAproveitamentoEm: sp.inicioAproveitamentoEm,
          itens: sp.itensLiberados.map((item) => ({
            nome: item.produto.nome,
            // só a fatia liberada — se for parcial, quantidadeTotal ajuda a UI avisar
            quantidade: item.quantidadeLiberada,
            quantidadeTotal: item.quantidade,
            observacao: item.observacao,
            nomesCriancas: item.nomesCriancas,
          })),
        };
      })
      // cliente a caminho primeiro -- é quem vai chegar no balcão a qualquer
      // momento, precisa pular na frente de quem ainda nem avisou que vem
      // buscar. .sort() é estável, então dentro de cada grupo a ordem por
      // horário de chegada (mais antigo primeiro) continua preservada.
      .sort((a, b) => Number(b.clienteACaminho) - Number(a.clienteACaminho)),
  });
}
