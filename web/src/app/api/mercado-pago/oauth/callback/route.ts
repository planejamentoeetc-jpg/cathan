import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarEstadoOauth, verificarEstadoOauthQuiosque } from "@/lib/sessaoGestor";
import { cifrar } from "@/lib/segredo";

// É o próprio Mercado Pago quem chama essa rota (ver middleware.ts — liberada
// sem exigir cookie de gestor). A autenticidade vem do "state" assinado, não
// de sessão — só quem passou pelo /api/mercado-pago/oauth/iniciar (organizador)
// ou .../iniciar-quiosque (quiosque, split por restaurante) da própria conta
// gera um state válido. A MESMA redirect_uri atende os dois fluxos -- o Mercado
// Pago só tem 1 URL cadastrada, então é o conteúdo do state que diferencia.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const erroMp = req.nextUrl.searchParams.get("error");

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

  const organizadorId = await verificarEstadoOauth(state);
  const quiosqueId = organizadorId ? null : await verificarEstadoOauthQuiosque(state);

  // resolve o destino do redirect antes de qualquer coisa dar errado, já que
  // até um erro precisa mandar a pessoa de volta pra tela certa
  let destino: URL;
  if (quiosqueId) {
    const quiosque = await prisma.quiosque.findUnique({
      where: { id: quiosqueId },
      select: { eventoId: true },
    });
    destino = new URL(
      quiosque ? `/gestor/eventos/${quiosque.eventoId}/quiosques/${quiosqueId}` : "/gestor",
      appUrl || req.url
    );
  } else {
    destino = new URL("/gestor/conexoes", appUrl || req.url);
  }

  if (erroMp) {
    destino.searchParams.set("erro", "recusado");
    return NextResponse.redirect(destino);
  }

  if ((!organizadorId && !quiosqueId) || !code) {
    destino.searchParams.set("erro", "estado_invalido");
    return NextResponse.redirect(destino);
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret || !appUrl) {
    destino.searchParams.set("erro", "nao_configurado");
    return NextResponse.redirect(destino);
  }

  try {
    const respostaToken = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/mercado-pago/oauth/callback`,
      }),
    });

    if (!respostaToken.ok) {
      console.error("Falha ao trocar code por token no OAuth do Mercado Pago", await respostaToken.text());
      destino.searchParams.set("erro", "falha_troca_token");
      return NextResponse.redirect(destino);
    }

    const dados = (await respostaToken.json()) as {
      access_token: string;
      refresh_token: string;
      user_id: number;
      expires_in: number;
    };

    const dadosConexao = {
      mpUserId: String(dados.user_id),
      mpAccessTokenCifrado: cifrar(dados.access_token),
      mpRefreshTokenCifrado: cifrar(dados.refresh_token),
      mpTokenExpiraEm: new Date(Date.now() + dados.expires_in * 1000),
    };

    if (quiosqueId) {
      await prisma.quiosque.update({ where: { id: quiosqueId }, data: dadosConexao });
    } else if (organizadorId) {
      await prisma.organizador.update({ where: { id: organizadorId }, data: dadosConexao });
    }

    destino.searchParams.set("conectado", "1");
    return NextResponse.redirect(destino);
  } catch (erro) {
    console.error("Erro inesperado no callback OAuth do Mercado Pago", erro);
    destino.searchParams.set("erro", "inesperado");
    return NextResponse.redirect(destino);
  }
}
