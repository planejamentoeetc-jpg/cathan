"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function UploadFotoProduto({
  apiUrl,
  fotoUrlInicial,
}: {
  // ex.: /api/eventos/{eventoId}/quiosques/{quiosqueId}/produtos/{produtoId}/foto (gestor)
  // ou /api/quiosques/{quiosqueId}/produtos/{produtoId}/foto (o próprio quiosque)
  apiUrl: string;
  fotoUrlInicial: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState(fotoUrlInicial);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarArquivo(arquivo: File) {
    setErro(null);
    setPreview(URL.createObjectURL(arquivo));
    setEnviando(true);

    try {
      const corpo = new FormData();
      corpo.append("foto", arquivo);

      const resposta = await fetch(apiUrl, { method: "POST", body: corpo });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível enviar a foto.");
        setPreview(null);
        setEnviando(false);
        return;
      }

      setFotoUrl(dados.fotoUrl);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setPreview(null);
    } finally {
      setEnviando(false);
    }
  }

  async function removerFoto() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch(apiUrl, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.erro ?? "Não foi possível remover a foto.");
        return;
      }
      setFotoUrl(null);
      setPreview(null);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  const imagemAtual = preview ?? fotoUrl;

  return (
    <div className="campo">
      <label>Foto do produto</label>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
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
            <img src={imagemAtual} alt="Foto do produto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="texto-fraco" style={{ fontSize: 10, textAlign: "center" }}>
              sem foto
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
          <button type="button" className="btn btn-secundario" disabled={enviando} onClick={() => inputRef.current?.click()}>
            {enviando ? "Enviando…" : fotoUrl ? "Trocar foto" : "Enviar foto"}
          </button>
          {fotoUrl && (
            <button
              type="button"
              className="btn btn-secundario"
              disabled={enviando}
              onClick={removerFoto}
              style={{ color: "#B4441C" }}
            >
              Remover foto
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="aviso" style={{ marginTop: 8 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
