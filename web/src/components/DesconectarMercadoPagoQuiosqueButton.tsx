"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DesconectarMercadoPagoQuiosqueButton({ quiosqueId }: { quiosqueId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function desconectar() {
    setEnviando(true);
    try {
      await fetch(`/api/mercado-pago/oauth/desconectar-quiosque/${quiosqueId}`, { method: "POST" });
      router.refresh();
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  if (confirmando) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-secundario"
          style={{ flex: 1 }}
          onClick={() => setConfirmando(false)}
        >
          Cancelar
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            background: "#D64545",
            color: "#fff",
            fontWeight: 700,
          }}
          disabled={enviando}
          onClick={desconectar}
        >
          {enviando ? "Desconectando…" : "Confirmar desconexão"}
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="btn btn-secundario btn-bloco" onClick={() => setConfirmando(true)}>
      Desconectar
    </button>
  );
}
