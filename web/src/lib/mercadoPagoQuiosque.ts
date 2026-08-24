import { Quiosque } from "@prisma/client";
import { MercadoPagoConfig } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { cifrar, decifrar } from "@/lib/segredo";

const MARGEM_EXPIRACAO_MS = 5 * 60 * 1000; // renova 5 min antes de expirar de verdade

type QuiosqueConexaoMp = Pick<
  Quiosque,
  "id" | "mpAccessTokenCifrado" | "mpRefreshTokenCifrado" | "mpTokenExpiraEm"
>;

/**
 * Devolve um client Mercado Pago usando o access token do PRÓPRIO restaurante
 * (conectado via OAuth pelo gestor, na tela de gerenciar o quiosque), renovando
 * via refresh_token automaticamente se estiver perto de expirar. Retorna null
 * se o quiosque não tem conexão MP ativa -- mesmo padrão de
 * lib/mercadoPagoOrganizador.ts, só que escopado ao quiosque em vez do evento
 * inteiro (split por restaurante individual, não por organizador).
 */
export async function obterClienteQuiosque(
  quiosque: QuiosqueConexaoMp
): Promise<MercadoPagoConfig | null> {
  if (!quiosque.mpAccessTokenCifrado || !quiosque.mpRefreshTokenCifrado || !quiosque.mpTokenExpiraEm) {
    return null;
  }

  const prestesAExpirar = quiosque.mpTokenExpiraEm.getTime() - Date.now() < MARGEM_EXPIRACAO_MS;

  if (!prestesAExpirar) {
    return new MercadoPagoConfig({ accessToken: decifrar(quiosque.mpAccessTokenCifrado) });
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
      refresh_token: decifrar(quiosque.mpRefreshTokenCifrado),
    }),
  });

  if (!resposta.ok) {
    // token de refresh pode ter sido revogado pelo restaurante direto no MP —
    // sem conexão válida, quem chama cai pro client global/organizador
    console.error("Falha ao renovar token MP do quiosque", quiosque.id, await resposta.text());
    return null;
  }

  const dados = (await resposta.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await prisma.quiosque.update({
    where: { id: quiosque.id },
    data: {
      mpAccessTokenCifrado: cifrar(dados.access_token),
      mpRefreshTokenCifrado: cifrar(dados.refresh_token),
      mpTokenExpiraEm: new Date(Date.now() + dados.expires_in * 1000),
    },
  });

  return new MercadoPagoConfig({ accessToken: dados.access_token });
}
