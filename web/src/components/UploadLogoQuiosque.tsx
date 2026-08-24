"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function UploadLogoQuiosque({
  eventoId,
  quiosqueId,
  logoUrlInicial,
}: {
  eventoId: string;
  quiosqueId: string;
  logoUrlInicial: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(logoUrlInicial);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarArquivo(arquivo: File) {
    setErro(null);
    setPreview(URL.createObjectURL(arquivo));
    setEnviando(true);

    try {
      const corpo = new FormData();
      corpo.append("logo", arquivo);

      const resposta = await fetch(`/api/eventos/${eventoId}/quiosques/${quiosqueId}/logo`, {
        method: "POST",
        body: corpo,
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível enviar a logo.");
        setPreview(null);
        setEnviando(false);
        return;
      }

      setLogoUrl(dados.logoUrl);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setPreview(null);
    } finally {
      setEnviando(false);
    }
  }

  async function removerLogo() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/quiosques/${quiosqueId}/logo`, {
        method: "DELETE",
      });
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.erro ?? "Não foi possível remover a logo.");
        return;
      }
      setLogoUrl(null);
      setPreview(null);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  const imagemAtual = preview ?? logoUrl;

  return (
    <div className="cartao">
      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 8 }}>
        Logo do restaurante
      </b>
      <p className="texto-fraco" style={{ marginBottom: 14 }}>
        Aparece como ícone na praça do evento (tipo tela inicial de celular) — sem logo, o
        quiosque mostra um ícone genérico colorido no lugar.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            overflow: "hidden",
            background: imagemAtual ? "transparent" : "var(--fundo-suave, #f0f0f0)",
            border: "1.5px solid var(--linha)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imagemAtual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagemAtual} alt="Logo do restaurante" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="texto-fraco" style={{ fontSize: 11, textAlign: "center" }}>
              sem logo
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviarArquivo(arquivo);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            {enviando ? "Enviando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
          </button>
          {logoUrl && (
            <button
              type="button"
              className="btn btn-secundario"
              disabled={enviando}
              onClick={removerLogo}
              style={{ color: "#B4441C" }}
            >
              Remover logo
            </button>
          )}
        </div>
      </div>

      {erro && <div className="aviso">{erro}</div>}
    </div>
  );
}
