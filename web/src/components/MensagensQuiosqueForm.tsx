"use client";

import { useState } from "react";

export function MensagensQuiosqueForm({
  quiosqueId,
  dicaInicial,
  mensagemPreparandoInicial,
  mensagemProntoInicial,
}: {
  quiosqueId: string;
  dicaInicial: string;
  mensagemPreparandoInicial: string;
  mensagemProntoInicial: string;
}) {
  const [dica, setDica] = useState(dicaInicial);
  const [mensagemPreparando, setMensagemPreparando] = useState(mensagemPreparandoInicial);
  const [mensagemPronto, setMensagemPronto] = useState(mensagemProntoInicial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    try {
      const resposta = await fetch(`/api/quiosques/${quiosqueId}/mensagens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dica, mensagemPreparando, mensagemPronto }),
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
      <p className="texto-fraco" style={{ marginBottom: 10 }}>
        Deixe em branco pra usar a mensagem padrão do Cathan.
      </p>
      <button type="button" className="btn btn-secundario btn-bloco" disabled={salvando} onClick={salvar}>
        {salvando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar mensagens"}
      </button>
    </div>
  );
}
