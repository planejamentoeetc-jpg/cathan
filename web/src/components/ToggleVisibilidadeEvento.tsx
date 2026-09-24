"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Botão rápido pra ligar/desligar um evento na lista pública de descoberta
// ("/"), sem sair da lista de eventos do Console Cathan. Usa stopPropagation
// porque o cartão inteiro do evento é um <Link> clicável.
export function ToggleVisibilidadeEvento({
  eventoId,
  visivelInicial,
}: {
  eventoId: string;
  visivelInicial: boolean;
}) {
  const router = useRouter();
  const [visivel, setVisivel] = useState(visivelInicial);
  const [enviando, setEnviando] = useState(false);

  async function alternar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (enviando) return;
    setEnviando(true);
    const novoValor = !visivel;
    try {
      const resposta = await fetch(`/api/admin/eventos/${eventoId}/visibilidade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visivelNaLista: novoValor }),
      });
      if (resposta.ok) {
        setVisivel(novoValor);
        router.refresh();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={enviando}
      title={visivel ? "Visível na lista pública — clique pra ocultar" : "Oculto da lista pública — clique pra mostrar"}
      style={{
        border: "1.5px solid var(--linha)",
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 11.5,
        fontFamily: "var(--font-manrope)",
        fontWeight: 700,
        background: visivel ? "var(--verde-suave)" : "#fff",
        color: visivel ? "var(--verde)" : "var(--cinza)",
        cursor: enviando ? "default" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {visivel ? "👁 Visível" : "🚫 Oculto"}
    </button>
  );
}
