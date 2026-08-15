"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerPedidosLocais, type PedidoLocal } from "@/lib/meusPedidos";

function horarioCurto(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Fica no topo da praça do evento -- é o jeito do cliente achar o pedido de
// volta quando ele sai da tela de acompanhamento (ex.: pra ver o cardápio de
// novo) e depois não lembra mais como chegar lá. Só existe pra dispositivos
// que já compraram algo neste evento (lista vem do localStorage, sem login).
export function MeusPedidosBanner({ eventoId }: { eventoId: string }) {
  const [pedidos, setPedidos] = useState<PedidoLocal[]>([]);

  useEffect(() => {
    setPedidos(lerPedidosLocais(eventoId));
  }, [eventoId]);

  if (pedidos.length === 0) return null;

  if (pedidos.length === 1) {
    return (
      <Link
        href={`/e/${eventoId}/pedido/${pedidos[0].pedidoId}`}
        className="cartao"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          textDecoration: "none",
        }}
      >
        <b style={{ fontFamily: "var(--font-sora)", color: "var(--grafite)" }}>📦 Ver meu pedido</b>
        <span style={{ fontSize: 20, color: "var(--verde)" }}>›</span>
      </Link>
    );
  }

  return (
    <div className="cartao" style={{ marginBottom: 16 }}>
      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 8 }}>
        📦 Meus pedidos neste evento
      </b>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pedidos.map((p) => (
          <Link
            key={p.pedidoId}
            href={`/e/${eventoId}/pedido/${p.pedidoId}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13.5,
              color: "var(--grafite)",
              textDecoration: "none",
            }}
          >
            <span>Pedido das {horarioCurto(p.criadoEm)}</span>
            <span style={{ color: "var(--verde)" }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
