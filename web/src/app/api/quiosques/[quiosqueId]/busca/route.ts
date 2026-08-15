import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Busca ampla, pro quiosque diagnosticar sozinho um pedido que o cliente diz ter
// feito mas não aparece na fila normal (ex.: comprou em quantidade e ainda não
// liberou nenhuma unidade -- a fila normal esconde isso de propósito, mas o
// quiosque precisa conseguir achar e entender o motivo sem depender de suporte).
// Por isso NÃO filtra por status ativo nem por quantidadeLiberada > 0, ao
// contrário da rota /fila.
export async function GET(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const termo = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (termo.length < 2) {
    return NextResponse.json({ pedidos: [] });
  }

  const digitos = termo.replace(/\D/g, "");

  const subPedidos = await prisma.subPedido.findMany({
    where: {
      quiosqueId: params.quiosqueId,
      OR: [
        { codigoRetirada: { contains: termo, mode: "insensitive" } },
        { pedido: { cliente: { nome: { contains: termo, mode: "insensitive" } } } },
        ...(digitos.length >= 4 ? [{ pedido: { cliente: { celular: { contains: digitos } } } }] : []),
      ],
    },
    orderBy: { criadoEm: "desc" },
    take: 20,
    include: {
      pedido: { include: { cliente: { select: { nome: true, celular: true } } } },
      itens: { include: { produto: { select: { nome: true } } } },
    },
  });

  return NextResponse.json({
    pedidos: subPedidos.map((sp) => ({
      id: sp.id,
      status: sp.status,
      codigoRetirada: sp.codigoRetirada,
      criadoEm: sp.criadoEm,
      clienteNome: sp.pedido.cliente.nome,
      clienteCelular: sp.pedido.cliente.celular,
      aguardandoLiberacao: sp.itens.every((item) => item.quantidadeLiberada === 0),
      itens: sp.itens.map((item) => ({
        nome: item.produto.nome,
        quantidade: item.quantidade,
        quantidadeLiberada: item.quantidadeLiberada,
      })),
    })),
  });
}
