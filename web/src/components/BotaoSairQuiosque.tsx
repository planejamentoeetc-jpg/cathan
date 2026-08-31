"use client";

import { useRouter } from "next/navigation";

// Variante do BotaoSair pro quiosque INDEPENDENTE com senha própria — limpa a
// sessão própria (cathan_quiosque_auth) em vez da senha geral do evento, e
// manda de volta pro login DELE, não pro login geral.
export function BotaoSairQuiosque({ eventoId, quiosqueId }: { eventoId: string; quiosqueId: string }) {
  const router = useRouter();

  async function sair() {
    await fetch(`/api/quiosques/${quiosqueId}/sair`, { method: "POST" });
    router.push(`/painel/${eventoId}/q/${quiosqueId}/entrar`);
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} style={{ fontSize: 12.5, color: "var(--cinza)" }}>
      Sair
    </button>
  );
}
