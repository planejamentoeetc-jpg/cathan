import { FormaPagamento } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ItemPedidoValidado, PedidoInvalidoError, criarPedidoAPartirDeItensValidados } from "@/lib/criarPedido";
import { obterPedido } from "@/lib/pagarMe";
import { prisma } from "@/lib/prisma";

// margem acima do timeout de 15s da transação em criarPedido.ts
export const maxDuration = 30;

// Endpoint público (sem autenticação de sessão). O Pagar.me não assina o corpo
// da notificação (ao contrário do Mercado Pago), então a autenticidade vem de
// duas camadas: 1) a chave na querystring, configurada só no cadastro do
// webhook no painel do Pagar.me; 2) o pedido é sempre reconsultado pela API
// antes de confirmar qualquer coisa — nunca confiamos no status que vem no
// corpo da notificação (mesmo padrão do webhook do Mercado Pago).
export async function POST(req: NextRequest) {
  const chaveEsperada = process.env.PAGARME_WEBHOOK_SECRET;
  if (!chaveEsperada) {
    console.error("PAGARME_WEBHOOK_SECRET não configurada no servidor.");
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 500 });
  }
  if (req.nextUrl.searchParams.get("chave") !== chaveEsperada) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: { type?: string; data?: { id?: string } };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Só nos importa a confirmação de pagamento do pedido (manda o id do pedido,
  // or_..., direto reconsultável em GET /orders/{id}); outros eventos
  // (recebedor atualizado, estorno, charge.paid isolado etc.) são ignorados.
  if (corpo.type !== "order.paid" || !corpo.data?.id) {
    return NextResponse.json({ ok: true });
  }

  let pedidoPagarMe;
  try {
    pedidoPagarMe = await obterPedido(corpo.data.id);
  } catch (erro) {
    console.error("Falha ao buscar pedido no Pagar.me", corpo.data.id, erro);
    return NextResponse.json({ ok: true });
  }

  const cobranca = pedidoPagarMe.charges?.[0];
  if (cobranca?.status !== "paid") {
    // pagamentos pendentes/falhos não geram pedido; uma futura notificação avisa se pagar depois
    return NextResponse.json({ ok: true });
  }

  const pedidoPendenteId = pedidoPagarMe.code;
  if (!pedidoPendenteId) {
    console.error("Pedido Pagar.me pago sem code (referência externa)", pedidoPagarMe.id);
    return NextResponse.json({ ok: true });
  }

  const pedidoPendente = await prisma.pedidoPendente.findUnique({ where: { id: pedidoPendenteId } });
  if (!pedidoPendente) {
    console.error("PedidoPendente não encontrado para o pedido Pagar.me", pedidoPagarMe.id, pedidoPendenteId);
    return NextResponse.json({ ok: true });
  }

  // idempotência: o Pagar.me pode reenviar a mesma notificação várias vezes
  if (pedidoPendente.status === "CONFIRMADO") {
    return NextResponse.json({ ok: true });
  }

  try {
    const itensOriginais = pedidoPendente.itens as unknown as ItemPedidoValidado[];

    // Revalida ativo/estoque ANTES de tentar criar, pra poder excluir só os itens
    // que pararam de existir/esgotaram nesse meio tempo, em vez de derrubar o
    // pedido inteiro por causa de 1 item — dinheiro já foi cobrado do cliente,
    // não dá pra simplesmente não honrar nada dele por causa de outra pessoa ter
    // esgotado 1 produto enquanto ele pagava.
    const produtoIds = [...new Set(itensOriginais.map((i) => i.produtoId))];
    const produtos = await prisma.produto.findMany({ where: { id: { in: produtoIds } } });
    const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

    const itensInvalidos: string[] = [];
    const itensValidos = itensOriginais.filter((item) => {
      const produto = produtosPorId.get(item.produtoId);
      if (!produto) {
        itensInvalidos.push(`item removido do cardápio (${item.quantidade}×)`);
        return false;
      }
      if (!produto.ativo) {
        itensInvalidos.push(`"${produto.nome}" esgotado (${item.quantidade}×)`);
        return false;
      }
      if (produto.estoque !== null && produto.estoque < item.quantidade) {
        itensInvalidos.push(`estoque insuficiente pra "${produto.nome}" (pediu ${item.quantidade}×)`);
        return false;
      }
      return true;
    });

    if (itensValidos.length === 0) {
      await prisma.pedidoPendente.update({
        where: { id: pedidoPendente.id },
        data: {
          status: "FALHOU",
          pagarmeOrderId: pedidoPagarMe.id,
          motivoFalha: `Nenhum item pôde ser honrado: ${itensInvalidos.join(", ")}`,
        },
      });
      console.error("Pagamento aprovado mas NENHUM item pôde ser honrado; requer reconciliação manual", {
        pedidoPendenteId: pedidoPendente.id,
        pedidoPagarMeId: pedidoPagarMe.id,
      });
      return NextResponse.json({ ok: true });
    }

    const resultado = await criarPedidoAPartirDeItensValidados({
      eventoId: pedidoPendente.eventoId,
      clienteNome: pedidoPendente.clienteNome,
      clienteCelular: pedidoPendente.clienteCelular,
      itens: itensValidos,
      formaPagamento: FormaPagamento.PAGARME,
    });

    await prisma.pedidoPendente.update({
      where: { id: pedidoPendente.id },
      data: {
        status: "CONFIRMADO",
        pedidoId: resultado.pedidoId,
        pagarmeOrderId: pedidoPagarMe.id,
        motivoFalha:
          itensInvalidos.length > 0
            ? `Item(ns) removido(s) automaticamente (indisponível): ${itensInvalidos.join(", ")} — acertar diferença de valor com o cliente`
            : null,
      },
    });
  } catch (erro) {
    if (erro instanceof PedidoInvalidoError) {
      await prisma.pedidoPendente
        .update({
          where: { id: pedidoPendente.id },
          data: { status: "FALHOU", pagarmeOrderId: pedidoPagarMe.id, motivoFalha: erro.message },
        })
        .catch(() => {});
      console.error("Pagamento aprovado mas pedido não pôde ser criado; requer reconciliação manual", {
        pedidoPendenteId: pedidoPendente.id,
        pedidoPagarMeId: pedidoPagarMe.id,
        motivo: erro.message,
      });
    } else {
      throw erro;
    }
  }

  return NextResponse.json({ ok: true });
}
