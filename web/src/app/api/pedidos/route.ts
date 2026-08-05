import { ModalidadeQuiosque, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { criarSubPedidoComCodigoUnico } from "@/lib/codigoRetirada";
import { distanciaMetros } from "@/lib/geo";
import { prisma } from "@/lib/prisma";

type ItemRequisicao = {
  produtoId: string;
  quantidade: number;
  observacao?: string;
  // um nome por unidade; só relevante quando o produto é de um quiosque BRINCADEIRAS
  nomesCriancas?: string[];
};

type CorpoRequisicao = {
  eventoId: string;
  clienteNome: string;
  clienteCelular: string;
  latitude?: number;
  longitude?: number;
  itens: ItemRequisicao[];
};

// Fluxo de pagamento é simulado nesta fase: todo pedido é criado já como aprovado.
export async function POST(req: NextRequest) {
  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.eventoId || !corpo.clienteNome?.trim() || !corpo.clienteCelular?.trim()) {
    return NextResponse.json({ erro: "Dados do cliente incompletos." }, { status: 400 });
  }
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    return NextResponse.json({ erro: "Carrinho vazio." }, { status: 400 });
  }
  if (corpo.itens.some((i) => !i.produtoId || !Number.isInteger(i.quantidade) || i.quantidade < 1)) {
    return NextResponse.json({ erro: "Item de carrinho inválido." }, { status: 400 });
  }

  const evento = await prisma.evento.findUnique({ where: { id: corpo.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  // --- Geofencing: validado no servidor, coordenadas nunca são persistidas ---
  if (evento.raioPedidosMetros !== null) {
    if (
      typeof corpo.latitude !== "number" ||
      typeof corpo.longitude !== "number" ||
      evento.latitude === null ||
      evento.longitude === null
    ) {
      return NextResponse.json(
        { erro: "Localização é obrigatória para pedidos neste evento." },
        { status: 400 }
      );
    }

    const distancia = distanciaMetros(evento.latitude, evento.longitude, corpo.latitude, corpo.longitude);

    if (distancia > evento.raioPedidosMetros) {
      return NextResponse.json(
        {
          erro: "Você está fora do raio de pedidos deste evento.",
          distanciaMetros: Math.round(distancia),
          raioPedidosMetros: evento.raioPedidosMetros,
        },
        { status: 403 }
      );
    }
  }

  const produtoIds = [...new Set(corpo.itens.map((i) => i.produtoId))];
  const produtos = await prisma.produto.findMany({
    where: { id: { in: produtoIds } },
    include: { quiosque: true },
  });

  if (produtos.length !== produtoIds.length) {
    return NextResponse.json({ erro: "Produto inválido no carrinho." }, { status: 400 });
  }

  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

  for (const produto of produtos) {
    if (produto.quiosque.eventoId !== evento.id) {
      return NextResponse.json(
        { erro: `Produto "${produto.nome}" não pertence a este evento.` },
        { status: 400 }
      );
    }
    if (!produto.ativo) {
      return NextResponse.json({ erro: `Produto "${produto.nome}" está esgotado.` }, { status: 409 });
    }
  }

  const quantidadePorProduto = new Map<string, number>();
  for (const item of corpo.itens) {
    quantidadePorProduto.set(item.produtoId, (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade);
  }
  for (const [produtoId, quantidade] of quantidadePorProduto) {
    const produto = produtosPorId.get(produtoId)!;
    if (produto.estoque !== null && produto.estoque < quantidade) {
      return NextResponse.json({ erro: `Estoque insuficiente para "${produto.nome}".` }, { status: 409 });
    }
  }

  const itensPorQuiosque = new Map<string, ItemRequisicao[]>();
  for (const item of corpo.itens) {
    const produto = produtosPorId.get(item.produtoId)!;
    const grupo = itensPorQuiosque.get(produto.quiosqueId) ?? [];
    grupo.push(item);
    itensPorQuiosque.set(produto.quiosqueId, grupo);
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.upsert({
        where: { celular: corpo.clienteCelular.trim() },
        update: { nome: corpo.clienteNome.trim() },
        create: { nome: corpo.clienteNome.trim(), celular: corpo.clienteCelular.trim() },
      });

      const pedido = await tx.pedido.create({
        data: { eventoId: evento.id, clienteId: cliente.id },
      });

      const subPedidosCriados = [];

      for (const [quiosqueId, itensDoGrupo] of itensPorQuiosque) {
        const quiosque = produtosPorId.get(itensDoGrupo[0].produtoId)!.quiosque;

        const subPedido = await criarSubPedidoComCodigoUnico((codigo) =>
          tx.subPedido.create({
            data: {
              pedidoId: pedido.id,
              quiosqueId,
              codigoRetirada: codigo,
              itens: {
                create: itensDoGrupo.map((item) => {
                  const produto = produtosPorId.get(item.produtoId)!;
                  return {
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    precoUnitario: produto.preco,
                    observacao: item.observacao,
                    nomesCriancas:
                      quiosque.modalidade === ModalidadeQuiosque.BRINCADEIRAS
                        ? (item.nomesCriancas ?? []).map((n) => n.trim()).filter(Boolean)
                        : [],
                  };
                }),
              },
            },
          })
        );

        subPedidosCriados.push({
          id: subPedido.id,
          quiosqueId,
          quiosqueNome: quiosque.nome,
          codigoRetirada: subPedido.codigoRetirada,
          status: subPedido.status,
        });
      }

      for (const [produtoId, quantidade] of quantidadePorProduto) {
        const produto = produtosPorId.get(produtoId)!;
        if (produto.estoque !== null) {
          await tx.produto.update({
            where: { id: produtoId },
            data: { estoque: { decrement: quantidade } },
          });
        }
      }

      return { pedidoId: pedido.id, subPedidos: subPedidosCriados };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    console.error("Falha ao criar pedido", erro);
    const mensagem =
      erro instanceof Prisma.PrismaClientKnownRequestError
        ? "Não foi possível concluir o pedido."
        : "Erro inesperado ao criar o pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
