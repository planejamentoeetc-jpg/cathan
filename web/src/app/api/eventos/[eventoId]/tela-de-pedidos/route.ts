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
          itens: { select: { nomesCriancas: true, produto: { select: { tempoProducaoMinutos: true } } } },
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
      pedidos: q.subPedidos.map((sp) => ({
        id: sp.id,
        status: sp.status,
        codigoRetirada: sp.codigoRetirada,
        clienteNome: sp.pedido.cliente.nome,
        nomesCriancas: sp.itens.flatMap((item) => item.nomesCriancas),
        duracaoMinutos: Math.max(0, ...sp.itens.map((item) => item.produto.tempoProducaoMinutos)),
        inicioAproveitamentoEm: sp.inicioAproveitamentoEm,
      })),
    })),
  });
}
