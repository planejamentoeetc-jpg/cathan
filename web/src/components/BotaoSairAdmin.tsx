"use client";

import { useRouter } from "next/navigation";

export function BotaoSairAdmin() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/admin/sair", { method: "POST" });
    router.push("/admin/entrar");
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} style={{ fontSize: 12.5, color: "var(--cinza)" }}>
      Sair
    </button>
  );
}
