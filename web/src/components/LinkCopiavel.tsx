"use client";

import { useState } from "react";

export function LinkCopiavel({ rotulo, url }: { rotulo: string; url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // navegador sem permissão de clipboard — usuário copia manualmente do texto exibido
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="texto-fraco" style={{ marginBottom: 4 }}>
        {rotulo}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          style={{
            flex: 1,
            border: "1.5px solid var(--linha)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12.5,
            fontFamily: "var(--font-mono)",
            background: "var(--neve)",
          }}
        />
        <button type="button" className="btn btn-secundario" onClick={copiar}>
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
