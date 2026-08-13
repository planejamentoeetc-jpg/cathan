import { NextRequest, NextResponse } from "next/server";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { assinarEstadoOauth } from "@/lib/sessaoGestor";

// Ponto de partida do "Conectar minha conta Mercado Pago" — assina um state de
// vida curta com o organizadorId (pra saber quem está conectando quando o MP
// chamar o callback de volta) e redireciona pro OAuth do Mercado Pago.
export async function GET() {
  const organizadorId = obterOrganizadorId();

  const appUrl = process.env.APP_URL;
  const clientId = process.env.MP_CLIENT_ID;
  if (!appUrl || !clientId) {
    return NextResponse.json(
      { erro: "MP_CLIENT_ID/APP_URL não configurados no servidor." },
      { status: 500 }
    );
  }

  const state = await assinarEstadoOauth(organizadorId);
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/mercado-pago/oauth/callback`;

  const url = new URL("https://auth.mercadopago.com.br/authorization");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
