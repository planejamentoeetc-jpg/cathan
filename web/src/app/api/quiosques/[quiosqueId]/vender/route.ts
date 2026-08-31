import { NextRequest, NextResponse } from "next/server";
import { criarPedidoAPartirDeItensValidados, PedidoInvalidoError } from "@/lib/criarPedido";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

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

// Venda assistida/em dinheiro no balcão do próprio quiosque independente: mesma
// mecânica do caixa do evento (ver api/caixa/[eventoId]/vender), mas restrita aos
// produtos deste quiosque -- cada estabelecimento cuida da própria venda manual.
export async function POST(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({
    where: { id: params.quiosqueId },
    include: { evento: true },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

  if (quiosque.evento.pedidosPausados) {
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
  const produtos = await prisma.produto.findMany({ where: { id: { in: produtoIds } } });

  if (produtos.length !== produtoIds.length) {
    return NextResponse.json({ erro: "Produto inválido no carrinho." }, { status: 400 });
  }

  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));
  for (const produto of produtos) {
    if (produto.quiosqueId !== quiosque.id) {
      return NextResponse.json(
        { erro: `Produto "${produto.nome}" não pertence a este quiosque.` },
        { status: 400 }
      );
    }
  }

  // sem celular informado (cliente sem PIX/telefone) — gera uma chave só pra não
  // colidir com o Cliente.celular único de outra venda; não representa contato real
  const clienteCelular = corpo.clienteCelular?.trim() || `caixa-${crypto.randomUUID()}`;

  try {
    const resultado = await criarPedidoAPartirDeItensValidados({
      eventoId: quiosque.eventoId,
      clienteNome: corpo.clienteNome.trim(),
      clienteCelular,
      formaPagamento: "DINHEIRO",
      liberarProducaoAutomaticamente: true,
      umTicketPorProduto: true,
      itens: corpo.itens.flatMap((item) => {
        const produto = produtosPorId.get(item.produtoId)!;
        const nomesCriancas =
          quiosque.modalidade === "BRINCADEIRAS"
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
    console.error("Falha ao registrar venda manual do quiosque", erro);
    return NextResponse.json({ erro: "Não foi possível registrar a venda." }, { status: 500 });
  }
}
