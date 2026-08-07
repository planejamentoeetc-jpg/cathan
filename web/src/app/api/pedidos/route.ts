import { Prisma } from "@prisma/client";
import { Preference } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { distanciaMetros } from "@/lib/geo";
import { ehAmbienteSandbox, mercadoPagoClient } from "@/lib/mercadoPago";
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

  try {
    const pedidoPendente = await prisma.pedidoPendente.create({
      data: {
        eventoId: evento.id,
        clienteNome: corpo.clienteNome.trim(),
        clienteCelular: corpo.clienteCelular.trim(),
        itens: itensValidados as unknown as Prisma.InputJsonValue,
      },
    });

    const retornoUrl = `${appUrl}/e/${evento.id}/checkout/retorno?pedidoPendenteId=${pedidoPendente.id}`;

    const preference = await new Preference(mercadoPagoClient).create({
      body: {
        items: itensValidados.map((item) => ({
          id: item.produtoId,
          title: produtosPorId.get(item.produtoId)!.nome,
          quantity: item.quantidade,
          unit_price: item.precoUnitario,
          currency_id: "BRL",
        })),
        payer: { name: corpo.clienteNome.trim() },
        back_urls: {
          success: retornoUrl,
          failure: retornoUrl,
          pending: retornoUrl,
        },
        // auto_return exige back_url https — sem efeito (e sem erro) em ambientes http locais
        ...(appUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
        notification_url: `${appUrl}/api/webhooks/mercado-pago`,
        external_reference: pedidoPendente.id,
      },
    });

    await prisma.pedidoPendente.update({
      where: { id: pedidoPendente.id },
      data: { mpPreferenceId: preference.id },
    });

    const checkoutUrl = ehAmbienteSandbox() ? preference.sandbox_init_point : preference.init_point;

    if (!checkoutUrl) {
      throw new Error("Mercado Pago não retornou uma URL de checkout.");
    }

    return NextResponse.json({ pedidoPendenteId: pedidoPendente.id, checkoutUrl }, { status: 201 });
  } catch (erro) {
    console.error("Falha ao iniciar checkout", erro);
    return NextResponse.json({ erro: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
