"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FormularioComissaoQuiosque({
  quiosqueId,
  comissaoInicial,
  comissaoPadraoEvento,
}: {
  quiosqueId: string;
  comissaoInicial: number | null;
  comissaoPadraoEvento: number;
}) {
  const router = useRouter();
  const [comissao, setComissao] = useState(comissaoInicial !== null ? String(comissaoInicial) : "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(valorParaSalvar: number | null) {
    setErro(null);
    setSalvo(false);
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/admin/quiosques/${quiosqueId}/comissao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comissaoPercentual: valorParaSalvar }),
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

  function aoSalvarClicar() {
    if (comissao.trim() === "") {
      salvar(null);
      return;
    }
    const valor = Number(comissao.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      setErro("Informe uma % entre 0 e 100, ou deixe em branco pra usar a do evento.");
      return;
    }
    salvar(valor);
  }

  return (
    <div className="campo" style={{ marginBottom: 0 }}>
      <label>% de comissão neste restaurante (em branco = {comissaoPadraoEvento}%, padrão do evento)</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          inputMode="decimal"
          placeholder={String(comissaoPadraoEvento)}
          value={comissao}
          onChange={(e) => {
            setComissao(e.target.value);
            setSalvo(false);
          }}
          style={{ maxWidth: 100 }}
        />
        <button type="button" className="btn btn-primario" disabled={enviando} onClick={aoSalvarClicar}>
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
