"use client";

const CHAVE = "cathan:cliente";

export type ClienteLocal = {
  nome: string;
  celular: string;
  // opcional só pra não quebrar quem já tinha um cliente salvo antes deste
  // campo existir (ver CheckoutForm — o Pagar.me exige CPF em todo pedido)
  cpf?: string;
};

export function lerClienteLocal(): ClienteLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as ClienteLocal) : null;
  } catch {
    return null;
  }
}

export function salvarClienteLocal(cliente: ClienteLocal) {
  window.localStorage.setItem(CHAVE, JSON.stringify(cliente));
}
