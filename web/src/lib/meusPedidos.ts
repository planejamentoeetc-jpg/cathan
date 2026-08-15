"use client";

function chave(eventoId: string) {
  return `cathan:meus-pedidos:${eventoId}`;
}

export type PedidoLocal = {
  pedidoId: string;
  criadoEm: number;
};

// Diferente do pixPendente (só pro pagamento em andamento, expira em 20min),
// isto é o histórico "meus pedidos deste evento, neste celular" -- sem prazo de
// validade -- pra sempre existir um jeito do cliente achar o pedido de volta
// mesmo tendo saído do checkout e voltado bem depois (ou dias depois).
export function lerPedidosLocais(eventoId: string): PedidoLocal[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(chave(eventoId));
    return bruto ? (JSON.parse(bruto) as PedidoLocal[]) : [];
  } catch {
    return [];
  }
}

export function adicionarPedidoLocal(eventoId: string, pedidoId: string) {
  if (typeof window === "undefined") return;
  const atuais = lerPedidosLocais(eventoId);
  if (atuais.some((p) => p.pedidoId === pedidoId)) return;
  const novos = [{ pedidoId, criadoEm: Date.now() }, ...atuais].slice(0, 20);
  window.localStorage.setItem(chave(eventoId), JSON.stringify(novos));
}
