"use client";

import { useRouter } from "next/navigation";

export function BotaoSairGestor() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/gestor/sair", { method: "POST" });
    router.push("/gestor/entrar");
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} style={{ fontSize: 12.5, color: "var(--cinza)" }}>
      Sair
    </button>
  );
}
