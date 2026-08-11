import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";

// Endpoint público (sem autenticação) — alimenta o telão visível a qualquer pessoa no evento.
export async function GET(_req: NextRequest, { params }: { params: { eventoId: string } }) {
  const quiosques = await prisma.quiosque.findMany({
    where: { eventoId: params.eventoId },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      cor: true,
      modalidade: true,
      subPedidos: {
        where: { status: { in: STATUS_ATIVOS } },
        orderBy: { criadoEm: "asc" },
        select: {
          id: true,
          status: true,
          codigoRetirada: true,
          inicioAproveitamentoEm: true,
          pedido: { select: { cliente: { select: { nome: true } } } },
          itens: {
            select: { nomesCriancas: true, liberadoParaProducao: true, produto: { select: { tempoProducaoMinutos: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json({
    quiosques: quiosques.map((q) => ({
      id: q.id,
      nome: q.nome,
      cor: q.cor,
      modalidade: q.modalidade,
      // mesma regra da fila do quiosque: itens ainda segurados pelo cliente não
      // aparecem no telão público até serem liberados pra produção.
      pedidos: q.subPedidos
        .map((sp) => ({ ...sp, itensLiberados: sp.itens.filter((item) => item.liberadoParaProducao) }))
        .filter((sp) => sp.itensLiberados.length > 0)
        .map((sp) => ({
          id: sp.id,
          status: sp.status,
          codigoRetirada: sp.codigoRetirada,
          clienteNome: sp.pedido.cliente.nome,
          nomesCriancas: sp.itensLiberados.flatMap((item) => item.nomesCriancas),
          duracaoMinutos: Math.max(0, ...sp.itensLiberados.map((item) => item.produto.tempoProducaoMinutos)),
          inicioAproveitamentoEm: sp.inicioAproveitamentoEm,
        })),
    })),
  });
}
