import { SignJWT, jwtVerify } from "jose";

// jose (não jsonwebtoken) de propósito — mesmo motivo do sessaoGestor.ts: roda
// em Edge Runtime, onde o middleware.ts precisaria verificar a cada requisição.
// Na prática hoje quem verifica essa sessão são as próprias páginas/rotas de
// cada quiosque (Node runtime, onde o Prisma funciona) -- ver comentário em
// cada rota que usa isto.
const DURACAO_SESSAO = "12h"; // mesma janela das demais sessões do painel

function obterChaveSecreta(): Uint8Array {
  const segredo = process.env.SESSAO_JWT_SECRET;
  if (!segredo) {
    throw new Error("SESSAO_JWT_SECRET não configurada no servidor.");
  }
  return new TextEncoder().encode(segredo);
}

// Sessão de um quiosque INDEPENDENTE específico -- diferente da senha global
// de PAINEL_QUIOSQUE_SENHA (que continua valendo só pros quiosques DO_EVENTO,
// já que são a mesma empresa/organizador). Carrega o quiosqueId pra nunca um
// restaurante conseguir usar a própria sessão pra abrir o painel de outro.
export async function assinarSessaoQuiosque(quiosqueId: string): Promise<string> {
  return new SignJWT({ quiosqueId, finalidade: "sessao-quiosque" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACAO_SESSAO)
    .sign(obterChaveSecreta());
}

/** Retorna o quiosqueId do token, ou null se ausente/inválido/expirado. */
export async function verificarSessaoQuiosque(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, obterChaveSecreta());
    if (payload.finalidade !== "sessao-quiosque") return null;
    return typeof payload.quiosqueId === "string" ? payload.quiosqueId : null;
  } catch {
    return null;
  }
}
