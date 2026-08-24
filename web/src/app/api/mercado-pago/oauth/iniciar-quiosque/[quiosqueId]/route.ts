import { NextResponse } from "next/server";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { assinarEstadoOauthQuiosque } from "@/lib/sessaoGestor";
import { prisma } from "@/lib/prisma";

// Ponto de partida do "Conectar Mercado Pago" de um QUIOSQUE específico (split
// por restaurante) -- feito pelo gestor, junto com o restaurante, na tela de
// gerenciar aquele quiosque. Mesma mecânica do fluxo de organizador
// (api/mercado-pago/oauth/iniciar), só que o state carrega o quiosqueId.
export async function GET(_req: Request, { params }: { params: { quiosqueId: string } }) {
  const organizadorId = obterOrganizadorId();

  const quiosque = await prisma.quiosque.findUnique({
    where: { id: params.quiosqueId },
    select: { evento: { select: { organizadorId: true } } },
  });
  if (!quiosque || quiosque.evento.organizadorId !== organizadorId) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  const appUrl = process.env.APP_URL;
  const clientId = process.env.MP_CLIENT_ID;
  if (!appUrl || !clientId) {
    return NextResponse.json(
      { erro: "MP_CLIENT_ID/APP_URL não configurados no servidor." },
      { status: 500 }
    );
  }

  const state = await assinarEstadoOauthQuiosque(params.quiosqueId);
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/mercado-pago/oauth/callback`;

  const url = new URL("https://auth.mercadopago.com.br/authorization");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
