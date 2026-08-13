import { Organizador } from "@prisma/client";
import { MercadoPagoConfig } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { cifrar, decifrar } from "@/lib/segredo";

const MARGEM_EXPIRACAO_MS = 5 * 60 * 1000; // renova 5 min antes de expirar de verdade

type OrganizadorConexaoMp = Pick<
  Organizador,
  "id" | "mpAccessTokenCifrado" | "mpRefreshTokenCifrado" | "mpTokenExpiraEm"
>;

/**
 * Devolve um client Mercado Pago usando o access token do PRÓPRIO organizador
 * (conectado via OAuth em /gestor/conexoes), renovando via refresh_token
 * automaticamente se estiver perto de expirar. Retorna null se o organizador
 * não tem conexão MP ativa — quem chama deve cair no client global
 * (lib/mercadoPago.ts) nesse caso, exatamente como funciona hoje.
 */
export async function obterClienteOrganizador(
  organizador: OrganizadorConexaoMp
): Promise<MercadoPagoConfig | null> {
  if (!organizador.mpAccessTokenCifrado || !organizador.mpRefreshTokenCifrado || !organizador.mpTokenExpiraEm) {
    return null;
  }

  const prestesAExpirar = organizador.mpTokenExpiraEm.getTime() - Date.now() < MARGEM_EXPIRACAO_MS;

  if (!prestesAExpirar) {
    return new MercadoPagoConfig({ accessToken: decifrar(organizador.mpAccessTokenCifrado) });
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MP_CLIENT_ID/MP_CLIENT_SECRET não configurados no servidor.");
  }

  const resposta = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: decifrar(organizador.mpRefreshTokenCifrado),
    }),
  });

  if (!resposta.ok) {
    // token de refresh pode ter sido revogado pelo organizador direto no MP —
    // sem conexão válida, quem chama cai pro client global
    console.error("Falha ao renovar token MP do organizador", organizador.id, await resposta.text());
    return null;
  }

  const dados = (await resposta.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await prisma.organizador.update({
    where: { id: organizador.id },
    data: {
      mpAccessTokenCifrado: cifrar(dados.access_token),
      mpRefreshTokenCifrado: cifrar(dados.refresh_token),
      mpTokenExpiraEm: new Date(Date.now() + dados.expires_in * 1000),
    },
  });

  return new MercadoPagoConfig({ accessToken: dados.access_token });
}
