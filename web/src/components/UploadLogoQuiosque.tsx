"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// os ícones da praça são quadrados (object-fit: cover) -- uma logo retangular
// enviada crua fica cortada nas bordas. Aqui a gente centraliza a logo inteira
// num canvas quadrado com fundo branco antes do upload, então o que chega no
// servidor já é o quadrado certo e o cover do ícone nunca corta nada.
const TAMANHO_ICONE = 512;

async function ajustarParaIcone(arquivo: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    return arquivo;
  }

  const canvas = document.createElement("canvas");
  canvas.width = TAMANHO_ICONE;
  canvas.height = TAMANHO_ICONE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return arquivo;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TAMANHO_ICONE, TAMANHO_ICONE);

  const escala = Math.min(TAMANHO_ICONE / bitmap.width, TAMANHO_ICONE / bitmap.height);
  const largura = bitmap.width * escala;
  const altura = bitmap.height * escala;
  ctx.drawImage(bitmap, (TAMANHO_ICONE - largura) / 2, (TAMANHO_ICONE - altura) / 2, largura, altura);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return arquivo;
  return new File([blob], "logo.png", { type: "image/png" });
}

export function UploadLogoQuiosque({
  apiUrl,
  logoUrlInicial,
}: {
  // ex.: /api/eventos/{eventoId}/quiosques/{quiosqueId}/logo (gestor) ou
  // /api/quiosques/{quiosqueId}/logo (o próprio quiosque)
  apiUrl: string;
  logoUrlInicial: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(logoUrlInicial);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarArquivo(arquivoOriginal: File) {
    setErro(null);
    setEnviando(true);

    try {
      const arquivo = await ajustarParaIcone(arquivoOriginal);
      setPreview(URL.createObjectURL(arquivo));

      const corpo = new FormData();
      corpo.append("logo", arquivo);

      const resposta = await fetch(apiUrl, {
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
      const resposta = await fetch(apiUrl, {
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
