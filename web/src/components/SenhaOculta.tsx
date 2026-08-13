"use client";

import { useState } from "react";
import { IconeOlho, IconeOlhoFechado } from "@/components/IconesOlho";

export function SenhaOculta({ rotulo, senha }: { rotulo: string; senha: string }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="texto-fraco" style={{ marginBottom: 4 }}>
        {rotulo}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            border: "1.5px solid var(--linha)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            background: "var(--neve)",
            letterSpacing: visivel ? "normal" : "2px",
          }}
        >
          {visivel ? senha : "•".repeat(Math.max(senha.length, 6))}
        </div>
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}
        >
          {visivel ? <IconeOlhoFechado tamanho={18} /> : <IconeOlho tamanho={18} />}
        </button>
      </div>
    </div>
  );
}
