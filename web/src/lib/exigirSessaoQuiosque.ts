import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Quiosque } from "@prisma/client";
import { verificarSessaoQuiosque } from "@/lib/sessaoQuiosque";

// Chame isto no topo de toda página server component dentro de
// painel/[eventoId]/q/[quiosqueId]/* (exceto a própria página .../entrar) —
// redireciona pro login PRÓPRIO do quiosque se ele for INDEPENDENTE e já
// tiver senha definida pelo gestor, mas a sessão atual não bater com ele.
//
// Enquanto o gestor não define uma senha própria (senhaHash null), o
// quiosque continua acessível pela senha geral do evento de sempre — isso é
// de propósito, pra não trancar de uma hora pra outra os quiosques
// independentes já existentes que ainda não migraram pra senha própria.
export async function exigirSessaoQuiosque(
  quiosque: Pick<Quiosque, "id" | "eventoId" | "tipo" | "senhaHash">,
  caminhoAtual: string
) {
  if (quiosque.tipo !== "INDEPENDENTE" || !quiosque.senhaHash) return;

  const token = cookies().get("cathan_quiosque_auth")?.value;
  const quiosqueIdSessao = await verificarSessaoQuiosque(token);
  if (quiosqueIdSessao === quiosque.id) return;

  const destino = `/painel/${quiosque.eventoId}/q/${quiosque.id}/entrar?redirect=${encodeURIComponent(caminhoAtual)}`;
  redirect(destino);
}
