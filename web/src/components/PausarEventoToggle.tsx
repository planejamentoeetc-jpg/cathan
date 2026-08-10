"use client";

import { useState } from "react";

export function PausarEventoToggle({
  eventoId,
  pausadoInicial,
}: {
  eventoId: string;
  pausadoInicial: boolean;
}) {
  const [pausado, setPausado] = useState(pausadoInicial);
  const [enviando, setEnviando] = useState(false);

  async function alternar() {
    const proximoValor = !pausado;
    if (proximoValor && !confirm("Pausar pedidos deste evento? Nenhum cliente conseguirá finalizar compras até você retomar.")) {
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/pausar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausado: proximoValor }),
      });
      if (resposta.ok) {
        setPausado(proximoValor);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="cartao"
      style={{
        marginBottom: 16,
        borderColor: pausado ? "var(--vermelho, #D64545)" : undefined,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div>
        <b style={{ fontFamily: "var(--font-sora)", display: "block" }}>
          {pausado ? "Pedidos pausados" : "Pedidos abertos"}
        </b>
        <span className="texto-fraco" style={{ fontSize: 12.5 }}>
          {pausado
            ? "Clientes veem um aviso e não conseguem finalizar novos pedidos."
            : "Use em caso de emergência: pausa pedidos em todos os quiosques deste evento."}
        </span>
      </div>
      <button
        type="button"
        className={pausado ? "btn btn-primario" : "btn btn-secundario"}
        onClick={alternar}
        disabled={enviando}
      >
        {pausado ? "Retomar pedidos" : "Pausar pedidos"}
      </button>
    </div>
  );
}
