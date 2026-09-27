"use client";

import { useState } from "react";

export type ItemPager = {
  id: string;
  codigoRetirada: string;
  quiosqueNome: string;
  brincadeira: boolean;
  mensagemPronto: string | null;
  // true quando este pedido é pra entrega no local do cliente em vez de
  // retirada no balcão -- muda o texto e troca "Estou indo!" (só um aviso) por
  // "Recebi o pedido" (confirma de verdade, ver confirmar-entrega/route.ts)
  entrega: boolean;
  // true depois que o cliente já tocou "Estou indo!" pra este item — continua
  // na tela cheia (pra ele mostrar o código no balcão), só que sem o pulso
  // chamativo e sem o botão, já que a ação dele já foi tomada. Não se aplica
  // a itens de entrega, que somem da tela assim que confirmados (o status
  // já vira RETIRADO no servidor).
  confirmado: boolean;
};

export function PagerPronto({
  itens,
  onConfirmar,
  onConfirmarEntrega,
}: {
  itens: ItemPager[];
  onConfirmar: (id: string) => void;
  onConfirmarEntrega: (id: string, observacao: string) => Promise<void> | void;
}) {
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<Set<string>>(new Set());

  if (itens.length === 0) return null;

  async function confirmarEntrega(id: string) {
    setConfirmando((atual) => new Set(atual).add(id));
    try {
      await onConfirmarEntrega(id, observacoes[id]?.trim() ?? "");
    } finally {
      setConfirmando((atual) => {
        const novo = new Set(atual);
        novo.delete(id);
        return novo;
      });
    }
  }

  function tituloItem(item: ItemPager) {
    if (item.entrega) return "Seu pedido saiu para entrega!";
    if (item.confirmado) return "A caminho da retirada";
    return item.mensagemPronto ?? (item.brincadeira ? "É a sua vez!" : "Seu pedido está pronto!");
  }

  function textoItem(item: ItemPager) {
    if (item.entrega) return "Está a caminho do local que você indicou.";
    return item.brincadeira
      ? "Vá até lá agora e mostre este código."
      : "Mostre este código no balcão para retirar.";
  }

  const todosConfirmados = itens.every((item) => item.confirmado);

  if (itens.length === 1) {
    const item = itens[0];
    return (
      <div className={`pager-overlay${!item.entrega && item.confirmado ? " pager-parado" : ""}`}>
        <h2>{tituloItem(item)}</h2>
        <div className="pager-anel">
          <b>{item.codigoRetirada}</b>
        </div>
        <p>
          {item.quiosqueNome}
          <br />
          {textoItem(item)}
        </p>
        {item.entrega ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <textarea
              value={observacoes[item.id] ?? ""}
              onChange={(e) => setObservacoes((atual) => ({ ...atual, [item.id]: e.target.value }))}
              placeholder="Observação (opcional)"
              rows={2}
              style={{ borderRadius: 10, border: "none", padding: "8px 10px", fontSize: 13, resize: "none" }}
            />
            <button
              type="button"
              className="btn-fechar"
              disabled={confirmando.has(item.id)}
              onClick={() => confirmarEntrega(item.id)}
            >
              {confirmando.has(item.id) ? "Confirmando…" : "Recebi o pedido ✓"}
            </button>
          </div>
        ) : (
          !item.confirmado && (
            <button type="button" className="btn-fechar" onClick={() => onConfirmar(item.id)}>
              Estou indo! 🏃
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <div className={`pager-overlay${todosConfirmados ? " pager-parado" : ""}`}>
      <h2>{itens.length} chamadas para você!</h2>
      <p>Cada uma é em um balcão — este é o seu roteiro:</p>
      <div className="pager-lista">
        {itens.map((item) => (
          <div key={item.id} className="pager-item">
            <b>{item.codigoRetirada}</b>
            <span>
              {item.quiosqueNome}
              <br />
              <span style={{ opacity: 0.85, fontWeight: 600 }}>
                {item.entrega ? "saiu para entrega" : item.brincadeira ? "é a sua vez" : "retire neste quiosque"}
              </span>
            </span>
            {item.entrega ? (
              confirmando.has(item.id) ? (
                <span className="pager-item-ok">Confirmando…</span>
              ) : (
                <button type="button" className="btn-fechar-mini" onClick={() => confirmarEntrega(item.id)}>
                  Recebi ✓
                </button>
              )
            ) : item.confirmado ? (
              <span className="pager-item-ok">✓ indo</span>
            ) : (
              <button type="button" className="btn-fechar-mini" onClick={() => onConfirmar(item.id)}>
                Estou indo! 🏃
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
