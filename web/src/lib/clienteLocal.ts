"use client";

const CHAVE = "cathan:cliente";

export type ClienteLocal = {
  nome: string;
  celular: string;
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
