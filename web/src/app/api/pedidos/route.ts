import { Prisma } from "@prisma/client";
import { Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { distanciaMetros } from "@/lib/geo";
import { mercadoPagoClient } from "@/lib/mercadoPago";
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
  clienteEmail: string;
  latitude?: number;
  longitude?: number;
  itens: ItemRequisicao[];
};

// Cria a intenção de compra (PedidoPendente) e uma preferência de pagamento no
// Mercado Pago. O Pedido/SubPedido reais só são criados quando o pagamento é
// confirmado pelo webhook (ver /api/webhooks/mercado-pago e lib/criarPedido.ts).
export async function POST(req: NextRequest) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return NextResponse.json({ erro: "APP_URL não configurada no servidor." }, { status: 500 });
  }

  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (
    !corpo.eventoId ||
    !corpo.clienteNome?.trim() ||
    !corpo.clienteCelular?.trim() ||
    !corpo.clienteEmail?.trim()
  ) {
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

  if (evento.pedidosPausados) {
    return NextResponse.json(
      { erro: "Os pedidos deste evento estão temporariamente pausados. Tente novamente em instantes." },
      { status: 423 }
    );
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

  // preço travado agora — é o valor que efetivamente vai para a preferência de pagamento
  const itensValidados = corpo.itens.map((item) => {
    const produto = produtosPorId.get(item.produtoId)!;
    return {
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: Number(produto.preco),
      observacao: item.observacao,
      nomesCriancas:
        produto.quiosque.modalidade === "BRINCADEIRAS"
          ? (item.nomesCriancas ?? []).map((n) => n.trim()).filter(Boolean)
          : [],
    };
  });

  const valorTotal = itensValidados.reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);
  const [primeiroNome, ...restoNome] = corpo.clienteNome.trim().split(/\s+/);

  try {
    const pedidoPendente = await prisma.pedidoPendente.create({
      data: {
        eventoId: evento.id,
        clienteNome: corpo.clienteNome.trim(),
        clienteCelular: corpo.clienteCelular.trim(),
        itens: itensValidados as unknown as Prisma.InputJsonValue,
      },
    });

    // Pix direto (Payments API) — o pagamento acontece dentro do próprio app,
    // sem redirecionar o cliente pro checkout hospedado do Mercado Pago.
    const payment = await new Payment(mercadoPagoClient).create({
      body: {
        transaction_amount: valorTotal,
        description: `${evento.nome} — pedido Cathan`,
        payment_method_id: "pix",
        payer: {
          email: corpo.clienteEmail.trim(),
          first_name: primeiroNome,
          last_name: restoNome.join(" ") || undefined,
        },
        notification_url: `${appUrl}/api/webhooks/mercado-pago`,
        external_reference: pedidoPendente.id,
      },
      requestOptions: { idempotencyKey: pedidoPendente.id },
    });

    const dadosPix = payment.point_of_interaction?.transaction_data;
    if (!payment.id || !dadosPix?.qr_code || !dadosPix?.qr_code_base64) {
      throw new Error("Mercado Pago não retornou os dados do Pix.");
    }

    await prisma.pedidoPendente.update({
      where: { id: pedidoPendente.id },
      data: { mpPaymentId: String(payment.id) },
    });

    return NextResponse.json(
      {
        pedidoPendenteId: pedidoPendente.id,
        pix: {
          copiaECola: dadosPix.qr_code,
          qrCodeBase64: dadosPix.qr_code_base64,
        },
      },
      { status: 201 }
    );
  } catch (erro) {
    console.error("Falha ao iniciar pagamento Pix", erro);
    return NextResponse.json({ erro: "Não foi possível gerar o Pix." }, { status: 500 });
  }
}
