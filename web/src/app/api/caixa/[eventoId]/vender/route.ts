import { NextRequest, NextResponse } from "next/server";
import { criarPedidoAPartirDeItensValidados, PedidoInvalidoError } from "@/lib/criarPedido";
import { prisma } from "@/lib/prisma";

// margem acima do timeout de 15s da transação em criarPedido.ts
export const maxDuration = 30;

type ItemRequisicao = {
  produtoId: string;
  quantidade: number;
  observacao?: string;
  nomesCriancas?: string[];
};

type CorpoRequisicao = {
  clienteNome: string;
  clienteCelular?: string;
  itens: ItemRequisicao[];
};

// Venda assistida/em dinheiro no balcão do evento: cria o Pedido diretamente, sem
// passar pelo Mercado Pago — ver lib/criarPedido.ts (mesma função usada pelo webhook).
export async function POST(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }

  if (evento.pedidosPausados) {
    return NextResponse.json(
      { erro: "Os pedidos deste evento estão temporariamente pausados." },
      { status: 423 }
    );
  }

  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.clienteNome?.trim()) {
    return NextResponse.json({ erro: "Informe o nome do cliente." }, { status: 400 });
  }
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    return NextResponse.json({ erro: "Carrinho vazio." }, { status: 400 });
  }
  if (corpo.itens.some((i) => !i.produtoId || !Number.isInteger(i.quantidade) || i.quantidade < 1)) {
    return NextResponse.json({ erro: "Item de carrinho inválido." }, { status: 400 });
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
  }

  // sem celular informado (cliente sem PIX/telefone) — gera uma chave só pra não
  // colidir com o Cliente.celular único de outra venda; não representa contato real
  const clienteCelular = corpo.clienteCelular?.trim() || `caixa-${crypto.randomUUID()}`;

  try {
    const resultado = await criarPedidoAPartirDeItensValidados({
      eventoId: evento.id,
      clienteNome: corpo.clienteNome.trim(),
      clienteCelular,
      formaPagamento: "DINHEIRO",
      liberarProducaoAutomaticamente: true,
      umTicketPorProduto: true,
      // uma entrada por UNIDADE, mesmo repetindo o mesmo produto -- vira um
      // ticket/código próprio pra cada uma (ver criarPedido.ts). Sem isso,
      // "2x Doce" imprimia num código só, e o quiosque não tinha como marcar
      // que só 1 das 2 unidades foi retirada.
      itens: corpo.itens.flatMap((item) => {
        const produto = produtosPorId.get(item.produtoId)!;
        const nomesCriancas =
          produto.quiosque.modalidade === "BRINCADEIRAS"
            ? (item.nomesCriancas ?? []).map((n) => n.trim()).filter(Boolean)
            : [];
        return Array.from({ length: item.quantidade }, (_, indice) => ({
          produtoId: item.produtoId,
          quantidade: 1,
          precoUnitario: Number(produto.preco),
          observacao: item.observacao,
          nomesCriancas: nomesCriancas[indice] ? [nomesCriancas[indice]] : [],
        }));
      }),
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    if (erro instanceof PedidoInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }
    console.error("Falha ao registrar venda manual", erro);
    return NextResponse.json({ erro: "Não foi possível registrar a venda." }, { status: 500 });
  }
}
