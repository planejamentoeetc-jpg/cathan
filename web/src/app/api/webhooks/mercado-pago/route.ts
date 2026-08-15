import {
  InvalidWebhookSignatureError,
  Payment,
  WebhookSignatureValidator,
} from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { ItemPedidoValidado, PedidoInvalidoError, criarPedidoAPartirDeItensValidados } from "@/lib/criarPedido";
import { mercadoPagoClient } from "@/lib/mercadoPago";
import { prisma } from "@/lib/prisma";

// margem acima do timeout de 15s da transação em criarPedido.ts
export const maxDuration = 30;

// Endpoint público (sem autenticação de sessão) — a autenticidade é garantida
// pela validação de assinatura abaixo, não pelo gate de senha do painel.
export async function POST(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("type") ?? req.nextUrl.searchParams.get("topic");
  const dataId = req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");

  // Só nos importa a notificação de pagamento; outros tópicos (merchant_order etc.) são ignorados.
  if (tipo !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("MP_WEBHOOK_SECRET não configurada no servidor.");
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 500 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
  } catch (erro) {
    if (erro instanceof InvalidWebhookSignatureError) {
      console.error("Assinatura de webhook inválida", erro.reason, erro.requestId);
      return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
    }
    throw erro;
  }

  // client global mesmo aqui, mesmo pra pagamentos de organizador conectado: o
  // token da aplicação Cathan (dona da conexão OAuth) tem acesso de leitura aos
  // pagamentos feitos pelas contas conectadas — não precisa resolver de quem é
  // o token antes de buscar (e nem daria: não sabemos de quem é até ler o
  // external_reference, que só vem dentro do próprio payment).
  let payment;
  try {
    payment = await new Payment(mercadoPagoClient).get({ id: dataId });
  } catch (erro) {
    // acontece com o botão "Simular notificação" do MP (manda um ID fictício que
    // não existe na conta) e, na vida real, com qualquer soneca da API do MP —
    // nenhum dos dois casos vale insistir com 500 (o MP só reenvia sem sucesso)
    console.error("Falha ao buscar pagamento no Mercado Pago", dataId, erro);
    return NextResponse.json({ ok: true });
  }

  if (payment.status !== "approved") {
    // pagamentos pendentes/rejeitados não geram pedido; uma futura notificação avisa se aprovar depois
    return NextResponse.json({ ok: true });
  }

  const pedidoPendenteId = payment.external_reference;
  if (!pedidoPendenteId) {
    console.error("Pagamento aprovado sem external_reference", payment.id);
    return NextResponse.json({ ok: true });
  }

  const pedidoPendente = await prisma.pedidoPendente.findUnique({ where: { id: pedidoPendenteId } });
  if (!pedidoPendente) {
    console.error("PedidoPendente não encontrado para o pagamento", payment.id, pedidoPendenteId);
    return NextResponse.json({ ok: true });
  }

  // idempotência: o MP pode reenviar a mesma notificação várias vezes
  if (pedidoPendente.status === "CONFIRMADO") {
    return NextResponse.json({ ok: true });
  }

  try {
    const itensOriginais = pedidoPendente.itens as unknown as ItemPedidoValidado[];

    // Revalida ativo/estoque ANTES de tentar criar, pra poder excluir só os itens
    // que pararam de existir/esgotaram nesse meio tempo, em vez de derrubar o
    // pedido inteiro por causa de 1 item — dinheiro já foi cobrado do cliente,
    // não dá pra simplesmente não honrar nada dele por causa de outra pessoa ter
    // esgotado 1 produto enquanto ele pagava (aconteceu de verdade em produção).
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
          mpPaymentId: String(payment.id),
          motivoFalha: `Nenhum item pôde ser honrado: ${itensInvalidos.join(", ")}`,
        },
      });
      console.error("Pagamento aprovado mas NENHUM item pôde ser honrado; requer reconciliação manual", {
        pedidoPendenteId: pedidoPendente.id,
        paymentId: payment.id,
      });
      return NextResponse.json({ ok: true });
    }

    const resultado = await criarPedidoAPartirDeItensValidados({
      eventoId: pedidoPendente.eventoId,
      clienteNome: pedidoPendente.clienteNome,
      clienteCelular: pedidoPendente.clienteCelular,
      itens: itensValidos,
    });

    await prisma.pedidoPendente.update({
      where: { id: pedidoPendente.id },
      data: {
        status: "CONFIRMADO",
        pedidoId: resultado.pedidoId,
        mpPaymentId: String(payment.id),
        motivoFalha:
          itensInvalidos.length > 0
            ? `Item(ns) removido(s) automaticamente (indisponível): ${itensInvalidos.join(", ")} — acertar diferença de valor com o cliente`
            : null,
      },
    });
  } catch (erro) {
    if (erro instanceof PedidoInvalidoError) {
      // não deveria mais acontecer pro caso comum (esgotado/estoque, já filtrado
      // acima) — sobra pra casos residuais (ex.: race condition bem no instante
      // da revalidação). Ainda assim marca como falha visível em vez de só logar.
      await prisma.pedidoPendente
        .update({
          where: { id: pedidoPendente.id },
          data: { status: "FALHOU", mpPaymentId: String(payment.id), motivoFalha: erro.message },
        })
        .catch(() => {});
      console.error("Pagamento aprovado mas pedido não pôde ser criado; requer reconciliação manual", {
        pedidoPendenteId: pedidoPendente.id,
        paymentId: payment.id,
        motivo: erro.message,
      });
    } else {
      throw erro;
    }
  }

  return NextResponse.json({ ok: true });
}
