"use client";

import { useRouter } from "next/navigation";

export function BotaoSairCaixa({ eventoId }: { eventoId: string }) {
  const router = useRouter();

  async function sair() {
    await fetch("/api/caixa/sair", { method: "POST" });
    router.push(`/caixa/${eventoId}/entrar`);
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} style={{ fontSize: 12.5, color: "#BFD4DA", flex: "0 0 auto" }}>
      Sair
    </button>
  );
}
