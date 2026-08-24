import { Prisma } from "@prisma/client";
import { Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { distanciaMetros } from "@/lib/geo";
import { mercadoPagoClient } from "@/lib/mercadoPago";
import { obterClienteOrganizador } from "@/lib/mercadoPagoOrganizador";
import { obterClienteQuiosque } from "@/lib/mercadoPagoQuiosque";
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

  if (!corpo.eventoId || !corpo.clienteNome?.trim() || !corpo.clienteCelular?.trim()) {
    return NextResponse.json({ erro: "Dados do cliente incompletos." }, { status: 400 });
  }
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    return NextResponse.json({ erro: "Carrinho vazio." }, { status: 400 });
  }
  if (corpo.itens.some((i) => !i.produtoId || !Number.isInteger(i.quantidade) || i.quantidade < 1)) {
    return NextResponse.json({ erro: "Item de carrinho inválido." }, { status: 400 });
  }

  const evento = await prisma.evento.findUnique({
    where: { id: corpo.eventoId },
    include: { organizador: true },
  });
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

  // Restaurante com Mercado Pago próprio conectado (split 1:1) só pode receber
  // sozinho — o Mercado Pago não permite dividir 1 cobrança entre contas
  // diferentes no modelo self-service. Só bloqueia mistura quando pelo menos
  // um dos quiosques do carrinho tem conexão própria; quiosques "do evento"
  // (sem conexão) continuam podendo se misturar entre si normalmente, como
  // sempre funcionou.
  const quiosquesEnvolvidos = new Map(produtos.map((p) => [p.quiosque.id, p.quiosque]));
  if (quiosquesEnvolvidos.size > 1) {
    const comConexaoPropria = [...quiosquesEnvolvidos.values()].filter((q) => q.mpAccessTokenCifrado);
    if (comConexaoPropria.length > 0) {
      return NextResponse.json(
        {
          erro: `O carrinho tem itens de mais de um restaurante. "${comConexaoPropria[0].nome}" recebe direto na própria conta e por isso precisa de um pedido separado — finalize esse restaurante primeiro.`,
        },
        { status: 409 }
      );
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

    // Prioridade de quem recebe o Pix: 1) o próprio restaurante, se ele tiver
    // conectado a própria conta Mercado Pago (só possível quando o carrinho
    // inteiro é de um quiosque só, ver checagem acima) -- 2) o organizador do
    // evento, se ele tiver conectado a dele -- 3) o client global de sempre,
    // sem nenhuma mudança de comportamento. Em qualquer um dos dois primeiros
    // casos, a Cathan retém a comissão automaticamente via application_fee.
    const quiosqueUnico = quiosquesEnvolvidos.size === 1 ? [...quiosquesEnvolvidos.values()][0] : null;
    const clienteQuiosque = quiosqueUnico ? await obterClienteQuiosque(quiosqueUnico) : null;
    const clienteOrganizador =
      !clienteQuiosque && evento.organizador ? await obterClienteOrganizador(evento.organizador) : null;
    const clientePagamento = clienteQuiosque ?? clienteOrganizador ?? mercadoPagoClient;

    const percentualComissao = clienteQuiosque
      ? Number(quiosqueUnico!.comissaoPercentual ?? evento.comissaoPercentual)
      : clienteOrganizador
      ? Number(evento.comissaoPercentual)
      : null;
    const applicationFee =
      percentualComissao !== null
        ? Math.round(valorTotal * (percentualComissao / 100) * 100) / 100
        : undefined;

    // Pix direto (Payments API) — o pagamento acontece dentro do próprio app,
    // sem redirecionar o cliente pro checkout hospedado do Mercado Pago.
    const corpoPagamentoBase = {
      transaction_amount: valorTotal,
      description: `${evento.nome} — pedido Cathan`,
      payment_method_id: "pix",
      payer: {
        // O checkout não pede e-mail do cliente (reduz fricção e ele nunca é
        // usado em nenhum outro lugar do sistema) — o Mercado Pago só exige o
        // campo pra gerar o Pix, sem verificar se é entregável.
        email: `pedido-${pedidoPendente.id}@cathan.com.br`,
        first_name: primeiroNome,
        last_name: restoNome.join(" ") || undefined,
      },
      notification_url: `${appUrl}/api/webhooks/mercado-pago`,
      external_reference: pedidoPendente.id,
    };

    let payment;
    try {
      payment = await new Payment(clientePagamento).create({
        body: {
          ...corpoPagamentoBase,
          ...(applicationFee !== undefined ? { application_fee: applicationFee } : {}),
        },
        requestOptions: { idempotencyKey: pedidoPendente.id },
      });
    } catch (erroPagamento) {
      const mensagem = erroPagamento instanceof Error ? erroPagamento.message : String(erroPagamento);
      if (applicationFee === undefined || !mensagem.includes("application_fee")) {
        throw erroPagamento;
      }
      // Mercado Pago recusou o split pra essa conta (ex.: restaurante ainda não
      // completou a verificação exigida do lado dele, ou organizador com
      // verificação de marketplace pendente) — tenta de novo sem comissão
      // automática, pra não travar o checkout. A comissão nesse caso precisa
      // ser acertada à parte até a conta ficar habilitada.
      console.error(
        "MP recusou application_fee, tentando sem split",
        clienteQuiosque ? `quiosque=${quiosqueUnico!.id}` : `organizador=${evento.organizador?.id}`,
        mensagem
      );
      payment = await new Payment(clientePagamento).create({
        body: corpoPagamentoBase,
        requestOptions: { idempotencyKey: pedidoPendente.id },
      });
    }

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
