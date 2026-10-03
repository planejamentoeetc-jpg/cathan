"use client";

import { useState } from "react";

const OPCOES_MINUTOS = [5, 10, 15, 20, 30, 45];

export function TempoEsperaControle({
  quiosqueId,
  tempoAtual,
  sugestao,
  pedidosAguardando,
  onAtualizado,
}: {
  quiosqueId: string;
  tempoAtual: number | null;
  sugestao: number | null;
  pedidosAguardando: number;
  onAtualizado: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [outro, setOutro] = useState("");

  async function salvar(minutos: number | null) {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/quiosques/${quiosqueId}/tempo-espera`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutos }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErro(corpo.erro ?? "Não foi possível salvar o tempo.");
        return;
      }
      setOutro("");
      onAtualizado();
    } finally {
      setSalvando(false);
    }
  }

  function salvarOutro() {
    const minutos = Number(outro);
    if (!Number.isInteger(minutos) || minutos < 1) {
      setErro("Digite um número inteiro de minutos.");
      return;
    }
    salvar(minutos);
  }

  return (
    <div className="cartao" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontFamily: "var(--font-sora)" }}>⏱ Tempo de espera para o cliente</b>
        <span style={{ fontWeight: 800 }}>{tempoAtual ? `~${tempoAtual} min` : "não informado"}</span>
      </div>
      <p className="texto-fraco" style={{ fontSize: 12.5, margin: "4px 0 10px" }}>
        Aparece na sua loja e no acompanhamento do pedido. Ajuste conforme a fila aumenta ou diminui.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {OPCOES_MINUTOS.map((minutos) => (
          <button
            key={minutos}
            type="button"
            className={tempoAtual === minutos ? "btn btn-primario" : "btn btn-secundario"}
            style={{ padding: "6px 12px", fontSize: 13 }}
            disabled={salvando}
            onClick={() => salvar(minutos)}
          >
            {minutos} min
          </button>
        ))}
        <button
          type="button"
          className="btn btn-secundario"
          style={{ padding: "6px 12px", fontSize: 13 }}
          disabled={salvando || tempoAtual === null}
          onClick={() => salvar(null)}
        >
          Não mostrar
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
        <input
          id="tempo-espera-outro"
          type="number"
          inputMode="numeric"
          min={1}
          max={180}
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
          placeholder="Outro (min)"
          style={{ width: 110, border: "1.5px solid var(--linha)", borderRadius: 8, padding: "6px 8px", fontSize: 13 }}
        />
        <button
          type="button"
          className="btn btn-secundario"
          style={{ padding: "6px 12px", fontSize: 13 }}
          disabled={salvando || !outro}
          onClick={salvarOutro}
        >
          Salvar
        </button>
      </div>

      {sugestao !== null && sugestao !== tempoAtual && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background: "var(--verde-suave)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          <span>
            Pela fila agora ({pedidosAguardando} {pedidosAguardando === 1 ? "pedido aguardando" : "pedidos aguardando"}):{" "}
            <strong>~{sugestao} min</strong>
          </span>
          <button
            type="button"
            className="btn btn-primario"
            style={{ padding: "5px 12px", fontSize: 12.5 }}
            disabled={salvando}
            onClick={() => salvar(sugestao)}
          >
            Usar sugestão
          </button>
        </div>
      )}

      {erro && (
        <div className="aviso" style={{ marginTop: 8, fontSize: 12.5 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
