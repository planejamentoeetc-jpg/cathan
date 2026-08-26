"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function UploadImagemFundo({
  apiUrl,
  imagemUrlInicial,
  titulo,
  descricao,
}: {
  // ex.: /api/eventos/{eventoId}/imagem-fundo, /api/quiosques/{quiosqueId}/imagem-fundo
  // ou /api/eventos/{eventoId}/quiosques/{quiosqueId}/imagem-fundo (gestor)
  apiUrl: string;
  imagemUrlInicial: string | null;
  titulo: string;
  descricao: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagemUrl, setImagemUrl] = useState(imagemUrlInicial);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarArquivo(arquivo: File) {
    setErro(null);
    setPreview(URL.createObjectURL(arquivo));
    setEnviando(true);

    try {
      const corpo = new FormData();
      corpo.append("imagem", arquivo);

      const resposta = await fetch(apiUrl, { method: "POST", body: corpo });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível enviar a imagem.");
        setPreview(null);
        setEnviando(false);
        return;
      }

      setImagemUrl(dados.imagemFundoUrl);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setPreview(null);
    } finally {
      setEnviando(false);
    }
  }

  async function removerImagem() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch(apiUrl, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.erro ?? "Não foi possível remover a imagem.");
        return;
      }
      setImagemUrl(null);
      setPreview(null);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  const imagemAtual = preview ?? imagemUrl;

  return (
    <div className="cartao">
      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 8 }}>{titulo}</b>
      <p className="texto-fraco" style={{ marginBottom: 14 }}>
        {descricao}
      </p>

      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 7",
          borderRadius: 14,
          overflow: "hidden",
          background: imagemAtual ? "transparent" : "var(--fundo-suave, #f0f0f0)",
          border: "1.5px solid var(--linha)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        {imagemAtual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagemAtual} alt={titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="texto-fraco" style={{ fontSize: 12 }}>
            sem imagem de fundo
          </span>
        )}
      </div>

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
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-secundario"
          style={{ flex: 1 }}
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          {enviando ? "Enviando…" : imagemUrl ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {imagemUrl && (
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={removerImagem}
            style={{ color: "#B4441C" }}
          >
            Remover
          </button>
        )}
      </div>

      {erro && (
        <div className="aviso" style={{ marginTop: 10 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
