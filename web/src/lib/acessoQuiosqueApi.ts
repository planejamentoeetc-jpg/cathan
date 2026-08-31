import { NextRequest, NextResponse } from "next/server";
import type { Quiosque } from "@prisma/client";
import { verificarSessaoQuiosque } from "@/lib/sessaoQuiosque";

// Use no topo de toda rota /api/quiosques/[quiosqueId]/* (exceto .../entrar e
// .../sair, que precisam ficar acessíveis sem sessão) — retorna uma resposta
// 401 pronta pra devolver se o quiosque for INDEPENDENTE com senha própria já
// definida e a sessão da requisição não bater com ele; retorna null se pode
// seguir normalmente (inclusive pro caso comum de quiosque DO_EVENTO ou
// INDEPENDENTE ainda sem senha própria, onde a senha geral do evento —
// já validada pelo middleware — continua sendo suficiente).
export async function verificarAcessoQuiosqueApi(
  req: NextRequest,
  quiosque: Pick<Quiosque, "id" | "tipo" | "senhaHash">
): Promise<NextResponse | null> {
  if (quiosque.tipo !== "INDEPENDENTE" || !quiosque.senhaHash) return null;

  const token = req.cookies.get("cathan_quiosque_auth")?.value;
  const quiosqueIdSessao = await verificarSessaoQuiosque(token);
  if (quiosqueIdSessao === quiosque.id) return null;

  return NextResponse.json({ erro: "Não autenticado neste quiosque." }, { status: 401 });
}
