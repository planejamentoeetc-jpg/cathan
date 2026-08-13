import { headers } from "next/headers";

// nome do header que o middleware injeta depois de verificar o JWT do cookie
// (ver web/src/middleware.ts) — só usável em Server Components/Route Handlers,
// nunca no próprio middleware (headers() do next/headers não roda lá)
export const HEADER_ORGANIZADOR_ID = "x-organizador-id";

export function obterOrganizadorId(): string {
  const organizadorId = headers().get(HEADER_ORGANIZADOR_ID);
  if (!organizadorId) {
    throw new Error(
      "organizadorId ausente — chamado fora de uma rota protegida pelo middleware do gestor?"
    );
  }
  return organizadorId;
}
