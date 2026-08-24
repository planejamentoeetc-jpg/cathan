import { SignJWT, jwtVerify } from "jose";

// jose (não jsonwebtoken) de propósito — roda em Edge Runtime, que é onde o
// middleware.ts precisa verificar a sessão a cada requisição.
const DURACAO_SESSAO = "12h"; // mesma janela do cookie-senha que isso substitui

function obterChaveSecreta(): Uint8Array {
  const segredo = process.env.SESSAO_JWT_SECRET;
  if (!segredo) {
    throw new Error("SESSAO_JWT_SECRET não configurada no servidor.");
  }
  return new TextEncoder().encode(segredo);
}

export async function assinarSessaoGestor(organizadorId: string): Promise<string> {
  return new SignJWT({ organizadorId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACAO_SESSAO)
    .sign(obterChaveSecreta());
}

/** Retorna o organizadorId do token, ou null se ausente/inválido/expirado. */
export async function verificarSessaoGestor(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, obterChaveSecreta());
    return typeof payload.organizadorId === "string" ? payload.organizadorId : null;
  } catch {
    return null;
  }
}

// "state" do fluxo OAuth do Mercado Pago — só precisa sobreviver o tempo da ida
// e volta até o Mercado Pago (a pessoa autorizando lá e voltando pro callback),
// por isso uma validade bem mais curta que a sessão normal
const DURACAO_ESTADO_OAUTH = "10m";

export async function assinarEstadoOauth(organizadorId: string): Promise<string> {
  return new SignJWT({ organizadorId, finalidade: "mp-oauth-state" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACAO_ESTADO_OAUTH)
    .sign(obterChaveSecreta());
}

export async function verificarEstadoOauth(state: string | null): Promise<string | null> {
  if (!state) return null;
  try {
    const { payload } = await jwtVerify(state, obterChaveSecreta());
    if (payload.finalidade !== "mp-oauth-state") return null;
    return typeof payload.organizadorId === "string" ? payload.organizadorId : null;
  } catch {
    return null;
  }
}

// mesma ideia do state acima, só que pra conexão MP de um QUIOSQUE específico
// (split por restaurante) -- finalidade diferente de propósito, pra nunca ser
// confundido com o state de organizador mesmo que alguém tente reaproveitar um
// pelo outro
// "origem" decide pra onde o callback manda a pessoa de volta depois de
// autorizar -- o gestor não tem a senha do painel do quiosque, e o quiosque
// não tem a senha do gestor, então cada fluxo precisa voltar pro lugar de
// onde saiu
export type OrigemOauthQuiosque = "gestor" | "quiosque";

export async function assinarEstadoOauthQuiosque(
  quiosqueId: string,
  origem: OrigemOauthQuiosque
): Promise<string> {
  return new SignJWT({ quiosqueId, origem, finalidade: "mp-oauth-state-quiosque" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACAO_ESTADO_OAUTH)
    .sign(obterChaveSecreta());
}

export async function verificarEstadoOauthQuiosque(
  state: string | null
): Promise<{ quiosqueId: string; origem: OrigemOauthQuiosque } | null> {
  if (!state) return null;
  try {
    const { payload } = await jwtVerify(state, obterChaveSecreta());
    if (payload.finalidade !== "mp-oauth-state-quiosque") return null;
    if (typeof payload.quiosqueId !== "string") return null;
    const origem = payload.origem === "quiosque" ? "quiosque" : "gestor";
    return { quiosqueId: payload.quiosqueId, origem };
  } catch {
    return null;
  }
}
