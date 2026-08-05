"use client";

import { useRouter } from "next/navigation";

export function BotaoSair({ eventoId }: { eventoId: string }) {
  const router = useRouter();

  async function sair() {
    await fetch("/api/painel/sair", { method: "POST" });
    router.push(`/painel/${eventoId}/entrar`);
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} style={{ fontSize: 12.5, color: "var(--cinza)" }}>
      Sair
    </button>
  );
}
