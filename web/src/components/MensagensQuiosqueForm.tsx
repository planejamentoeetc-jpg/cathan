"use client";

import { useState } from "react";

export function MensagensQuiosqueForm({
  quiosqueId,
  dicaInicial,
  mensagemPreparandoInicial,
  mensagemProntoInicial,
  combinaComIdInicial,
  outrosQuiosques,
}: {
  quiosqueId: string;
  dicaInicial: string;
  mensagemPreparandoInicial: string;
  mensagemProntoInicial: string;
  combinaComIdInicial: string;
  outrosQuiosques: { id: string; nome: string }[];
}) {
  const [dica, setDica] = useState(dicaInicial);
  const [mensagemPreparando, setMensagemPreparando] = useState(mensagemPreparandoInicial);
  const [mensagemPronto, setMensagemPronto] = useState(mensagemProntoInicial);
  const [combinaComId, setCombinaComId] = useState(combinaComIdInicial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    try {
      const resposta = await fetch(`/api/quiosques/${quiosqueId}/mensagens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dica, mensagemPreparando, mensagemPronto, combinaComId }),
      });
      if (resposta.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="cartao">
      <div className="campo">
        <label>Dica pros clientes (aparece na praça do evento e na sua loja)</label>
        <input
          type="text"
          value={dica}
          onChange={(e) => setDica(e.target.value)}
          placeholder='Ex.: "Não deixe de provar nossa pipoca doce!"'
        />
      </div>
      <div className="campo">
        <label>Mensagem enquanto o pedido está sendo preparado</label>
        <input
          type="text"
          value={mensagemPreparando}
          onChange={(e) => setMensagemPreparando(e.target.value)}
          placeholder='Ex.: "Já estou sentindo o cheirinho!"'
        />
      </div>
      <div className="campo">
        <label>Mensagem quando o pedido fica pronto</label>
        <input
          type="text"
          value={mensagemPronto}
          onChange={(e) => setMensagemPronto(e.target.value)}
          placeholder='Ex.: "Pipoca quentinha te esperando!"'
        />
      </div>
      {outrosQuiosques.length > 0 && (
        <div className="campo">
          <label>Combina com (sugestão de compra pro cliente)</label>
          <select
            value={combinaComId}
            onChange={(e) => setCombinaComId(e.target.value)}
            style={{
              border: "1.5px solid var(--linha)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            <option value="">Nenhum</option>
            {outrosQuiosques.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </select>
          <span className="texto-fraco" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
            Quando o cliente já tiver algo seu no carrinho, sugerimos uma passada nesse quiosque.
          </span>
        </div>
      )}
      <p className="texto-fraco" style={{ marginBottom: 10 }}>
        Deixe em branco pra usar a mensagem padrão do Cathan.
      </p>
      <button type="button" className="btn btn-secundario btn-bloco" disabled={salvando} onClick={salvar}>
        {salvando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar mensagens"}
      </button>
    </div>
  );
}
