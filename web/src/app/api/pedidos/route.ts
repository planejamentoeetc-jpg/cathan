import { Prisma } from "@prisma/client";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { distanciaMetros } from "@/lib/geo";
import { obterClienteOrganizador } from "@/lib/mercadoPagoOrganizador";
import { obterClienteQuiosque } from "@/lib/mercadoPagoQuiosque";
import { criarPedidoPixComSplit, obterRecebedorPadrao, type DivisaoSplitPagarMe } from "@/lib/pagarMe";
import { validarCpf } from "@/lib/cpf";
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
  // exigido pelo Pagar.me em todo pedido (é o recebedor oficial da Cathan hoje,
  // ver cathan_baas_provider_decision) -- nunca chega até o Mercado Pago
  clienteCpf: string;
  latitude?: number;
  longitude?: number;
  itens: ItemRequisicao[];
};

type RotaPagamento =
  | { provedor: "mp"; cliente: MercadoPagoConfig; percentualComissao?: number }
  | { provedor: "pagarme"; divisoes?: DivisaoSplitPagarMe[] };

// Cria a intenção de compra (PedidoPendente) e a cobrança Pix no provedor
// certo. O Pedido/SubPedido reais só são criados quando o pagamento é
// confirmado pelo webhook (ver /api/webhooks/mercado-pago,
// /api/webhooks/pagar-me e lib/criarPedido.ts).
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
    !corpo.clienteCpf?.trim()
  ) {
    return NextResponse.json({ erro: "Dados do cliente incompletos." }, { status: 400 });
  }
  if (!validarCpf(corpo.clienteCpf)) {
    return NextResponse.json({ erro: "CPF inválido." }, { status: 400 });
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

  const quiosquesEnvolvidos = new Map(produtos.map((p) => [p.quiosque.id, p.quiosque]));

  // Restaurante independente que só tem o Mercado Pago próprio conectado
  // (ainda não migrou pro Pagar.me) só pode receber sozinho -- o MP não
  // divide 1 cobrança entre contas diferentes no modelo self-service. Quem já
  // tem recebedor Pagar.me pode se misturar livremente (é exatamente o split
  // N:1 que o Pagar.me resolve); quiosques "do evento" sempre podem se
  // misturar, como sempre funcionou.
  const independentesEnvolvidos = [...quiosquesEnvolvidos.values()].filter((q) => q.tipo === "INDEPENDENTE");
  const independentesComPagarme = independentesEnvolvidos.filter((q) => q.pagarmeRecipientId);
  const independentesSoMp = independentesEnvolvidos.filter((q) => !q.pagarmeRecipientId && q.mpAccessTokenCifrado);

  if (quiosquesEnvolvidos.size > 1 && independentesSoMp.length > 0) {
    return NextResponse.json(
      {
        erro: `O carrinho tem itens de mais de um restaurante. "${independentesSoMp[0].nome}" ainda recebe direto na própria conta Mercado Pago e por isso precisa de um pedido separado — finalize esse restaurante primeiro.`,
      },
      { status: 409 }
    );
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

  // preço travado agora — é o valor que efetivamente vai para a cobrança
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
  const valorTotalCentavos = Math.round(valorTotal * 100);
  const [primeiroNome, ...restoNome] = corpo.clienteNome.trim().split(/\s+/);

  const subtotalPorQuiosque = new Map<string, number>();
  for (const item of itensValidados) {
    const produto = produtosPorId.get(item.produtoId)!;
    const soma = item.precoUnitario * item.quantidade;
    subtotalPorQuiosque.set(produto.quiosqueId, (subtotalPorQuiosque.get(produto.quiosqueId) ?? 0) + soma);
  }

  const quiosqueUnico = quiosquesEnvolvidos.size === 1 ? [...quiosquesEnvolvidos.values()][0] : null;

  // Decide quem recebe o Pix, em ordem de prioridade:
  // 1) restaurante independente único já migrado pro Pagar.me — o recebedor
  //    dele entra no split junto com a comissão da Cathan.
  // 2) restaurante independente único, ainda só no Mercado Pago (legado).
  // 3) carrinho com 2+ restaurantes independentes — só chega aqui se todos os
  //    que têm conexão própria já migraram pro Pagar.me (bloqueio acima cobre
  //    o resto); é o split N:1 que o Mercado Pago nunca fez.
  // 4) sem restaurante independente envolvido, organizador com Mercado Pago
  //    próprio conectado — não muda onde o dinheiro dele cai sem ele pedir.
  // 5) padrão: Pagar.me é o recebedor oficial da Cathan hoje, sem split (100%
  //    cai direto na conta principal — substitui o antigo client global do MP).
  // TS não propaga o "if (!evento) return" pra dentro de uma função aninhada —
  // essa cópia carrega o tipo já não-nulo pro closure abaixo.
  const eventoValidado = evento;

  async function decidirRota(): Promise<RotaPagamento> {
    if (quiosqueUnico?.pagarmeRecipientId) {
      const recebedorPadrao = await obterRecebedorPadrao();
      const percentual = Number(quiosqueUnico.comissaoPercentual ?? eventoValidado.comissaoPercentual);
      const comissaoCentavos = Math.round(valorTotalCentavos * (percentual / 100));
      return {
        provedor: "pagarme",
        divisoes: [
          {
            recipientId: quiosqueUnico.pagarmeRecipientId,
            tipo: "flat",
            valor: valorTotalCentavos - comissaoCentavos,
            responsavelPelaTaxa: false,
          },
          { recipientId: recebedorPadrao.id, tipo: "flat", valor: comissaoCentavos, responsavelPelaTaxa: true },
        ],
      };
    }

    if (quiosqueUnico) {
      const clienteQuiosque = await obterClienteQuiosque(quiosqueUnico);
      if (clienteQuiosque) {
        return {
          provedor: "mp",
          cliente: clienteQuiosque,
          percentualComissao: Number(quiosqueUnico.comissaoPercentual ?? eventoValidado.comissaoPercentual),
        };
      }
    }

    if (independentesComPagarme.length > 0) {
      const recebedorPadrao = await obterRecebedorPadrao();
      let somaRestaurantes = 0;
      const divisoesRestaurantes: DivisaoSplitPagarMe[] = [];
      for (const quiosque of independentesComPagarme) {
        const subtotalCentavos = Math.round((subtotalPorQuiosque.get(quiosque.id) ?? 0) * 100);
        const percentual = Number(quiosque.comissaoPercentual ?? eventoValidado.comissaoPercentual);
        const comissaoCentavos = Math.round(subtotalCentavos * (percentual / 100));
        const valorRestaurante = subtotalCentavos - comissaoCentavos;
        somaRestaurantes += valorRestaurante;
        divisoesRestaurantes.push({
          recipientId: quiosque.pagarmeRecipientId!,
          tipo: "flat",
          valor: valorRestaurante,
          responsavelPelaTaxa: false,
        });
      }
      divisoesRestaurantes.push({
        recipientId: recebedorPadrao.id,
        tipo: "flat",
        valor: valorTotalCentavos - somaRestaurantes,
        responsavelPelaTaxa: true,
      });
      return { provedor: "pagarme", divisoes: divisoesRestaurantes };
    }

    const clienteOrganizador = eventoValidado.organizador
      ? await obterClienteOrganizador(eventoValidado.organizador)
      : null;
    if (clienteOrganizador) {
      return {
        provedor: "mp",
        cliente: clienteOrganizador,
        percentualComissao: Number(eventoValidado.comissaoPercentual),
      };
    }

    return { provedor: "pagarme" };
  }

  try {
    const pedidoPendente = await prisma.pedidoPendente.create({
      data: {
        eventoId: evento.id,
        clienteNome: corpo.clienteNome.trim(),
        clienteCelular: corpo.clienteCelular.trim(),
        itens: itensValidados as unknown as Prisma.InputJsonValue,
      },
    });

    const rota = await decidirRota();

    let copiaECola: string | undefined;
    let qrCodeBase64: string | undefined;
    let qrCodeUrl: string | undefined;

    if (rota.provedor === "pagarme") {
      const pedidoPagarMe = await criarPedidoPixComSplit({
        itens: itensValidados.map((item) => ({
          descricao: produtosPorId.get(item.produtoId)!.nome,
          valorCentavos: Math.round(item.precoUnitario * 100),
          quantidade: item.quantidade,
        })),
        clienteNome: corpo.clienteNome.trim(),
        clienteDocumento: corpo.clienteCpf,
        clienteEmail: `pedido-${pedidoPendente.id}@cathan.com.br`,
        clienteCelular: corpo.clienteCelular.trim(),
        referenciaExterna: pedidoPendente.id,
        divisoes: rota.divisoes,
      });

      const transacao = pedidoPagarMe.charges?.[0]?.last_transaction;
      copiaECola = transacao?.qr_code;
      qrCodeUrl = transacao?.qr_code_url;

      if (!pedidoPagarMe.id || !copiaECola) {
        throw new Error("Pagar.me não retornou os dados do Pix.");
      }

      await prisma.pedidoPendente.update({
        where: { id: pedidoPendente.id },
        data: { pagarmeOrderId: pedidoPagarMe.id },
      });
    } else {
      const percentualComissao = rota.percentualComissao;
      const applicationFee =
        percentualComissao !== undefined
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
        payment = await new Payment(rota.cliente).create({
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
        console.error("MP recusou application_fee, tentando sem split", mensagem);
        payment = await new Payment(rota.cliente).create({
          body: corpoPagamentoBase,
          requestOptions: { idempotencyKey: pedidoPendente.id },
        });
      }

      const dadosPix = payment.point_of_interaction?.transaction_data;
      if (!payment.id || !dadosPix?.qr_code || !dadosPix?.qr_code_base64) {
        throw new Error("Mercado Pago não retornou os dados do Pix.");
      }
      copiaECola = dadosPix.qr_code;
      qrCodeBase64 = dadosPix.qr_code_base64;

      await prisma.pedidoPendente.update({
        where: { id: pedidoPendente.id },
        data: { mpPaymentId: String(payment.id) },
      });
    }

    return NextResponse.json(
      {
        pedidoPendenteId: pedidoPendente.id,
        pix: { copiaECola, qrCodeBase64, qrCodeUrl },
      },
      { status: 201 }
    );
  } catch (erro) {
    console.error("Falha ao iniciar pagamento Pix", erro);
    return NextResponse.json({ erro: "Não foi possível gerar o Pix." }, { status: 500 });
  }
}
