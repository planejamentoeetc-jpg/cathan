import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarEstadoOauth } from "@/lib/sessaoGestor";
import { cifrar } from "@/lib/segredo";

// É o próprio Mercado Pago quem chama essa rota (ver middleware.ts — liberada
// sem exigir cookie de gestor). A autenticidade vem do "state" assinado, não
// de sessão — só quem passou pelo /api/mercado-pago/oauth/iniciar da própria
// conta gera um state válido.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const erroMp = req.nextUrl.searchParams.get("error");

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const destino = new URL("/gestor/conexoes", appUrl || req.url);

  if (erroMp) {
    destino.searchParams.set("erro", "recusado");
    return NextResponse.redirect(destino);
  }

  const organizadorId = await verificarEstadoOauth(state);
  if (!organizadorId || !code) {
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

    await prisma.organizador.update({
      where: { id: organizadorId },
      data: {
        mpUserId: String(dados.user_id),
        mpAccessTokenCifrado: cifrar(dados.access_token),
        mpRefreshTokenCifrado: cifrar(dados.refresh_token),
        mpTokenExpiraEm: new Date(Date.now() + dados.expires_in * 1000),
      },
    });

    destino.searchParams.set("conectado", "1");
    return NextResponse.redirect(destino);
  } catch (erro) {
    console.error("Erro inesperado no callback OAuth do Mercado Pago", erro);
    destino.searchParams.set("erro", "inesperado");
    return NextResponse.redirect(destino);
  }
}
