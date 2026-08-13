"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FormularioComissaoOrganizador({
  organizadorId,
  comissaoInicial,
}: {
  organizadorId: string;
  comissaoInicial: number;
}) {
  const router = useRouter();
  const [comissao, setComissao] = useState(String(comissaoInicial));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvo(false);

    const valor = Number(comissao.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      setErro("Informe uma % entre 0 e 100.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/admin/organizadores/${organizadorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comissaoPercentual: valor }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="campo">
      <label>% de comissão da Cathan</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          inputMode="decimal"
          value={comissao}
          onChange={(e) => {
            setComissao(e.target.value);
            setSalvo(false);
          }}
          style={{ maxWidth: 100 }}
        />
        <button type="button" className="btn btn-primario" disabled={enviando} onClick={salvar}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {salvo && (
        <p className="texto-fraco" style={{ marginTop: 6, color: "var(--verde)" }}>
          ✓ Comissão atualizada.
        </p>
      )}
      {erro && (
        <div className="aviso" style={{ marginTop: 8 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
