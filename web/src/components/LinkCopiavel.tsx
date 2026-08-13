"use client";

import { useState } from "react";

export function LinkCopiavel({
  rotulo,
  url,
  qrCodeDataUrl,
}: {
  rotulo: string;
  url: string;
  // gerado no servidor (lib/qrcode.ts) e passado pronto — evita depender de uma
  // biblioteca de QR code rodando no navegador
  qrCodeDataUrl?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

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
        {qrCodeDataUrl && (
          <button type="button" className="btn btn-secundario" onClick={() => setMostrarQr((v) => !v)}>
            {mostrarQr ? "Ocultar QR" : "QR Code"}
          </button>
        )}
      </div>

      {mostrarQr && qrCodeDataUrl && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <img
            src={qrCodeDataUrl}
            alt={`QR code para ${rotulo}`}
            style={{ width: 180, height: 180, borderRadius: 10, border: "1.5px solid var(--linha)" }}
          />
          <p className="texto-fraco" style={{ marginTop: 6, fontSize: 12 }}>
            Aproxime a câmera do celular ou tablet pra abrir direto.
          </p>
        </div>
      )}
    </div>
  );
}
