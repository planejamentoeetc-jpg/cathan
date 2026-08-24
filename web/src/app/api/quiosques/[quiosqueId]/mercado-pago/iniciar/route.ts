import { NextResponse } from "next/server";
import { assinarEstadoOauthQuiosque } from "@/lib/sessaoGestor";
import { prisma } from "@/lib/prisma";

// Mesmo fluxo de api/mercado-pago/oauth/iniciar-quiosque, só que iniciado
// pelo próprio quiosque (senha do painel) em vez do gestor -- por isso vive
// sob /api/quiosques, que o middleware libera com a senha do quiosque, não
// a do gestor.
export async function GET(_req: Request, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
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

  const state = await assinarEstadoOauthQuiosque(params.quiosqueId, "quiosque");
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/mercado-pago/oauth/callback`;

  const url = new URL("https://auth.mercadopago.com.br/authorization");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
