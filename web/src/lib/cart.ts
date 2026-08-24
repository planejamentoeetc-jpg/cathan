"use client";

import { useCallback, useEffect, useState } from "react";

export type ItemCarrinho = {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
  quiosqueId: string;
  quiosqueNome: string;
  quiosqueCor: string;
  quiosqueModalidade: "ALIMENTACAO" | "BEBIDAS" | "BRINCADEIRAS";
  // true quando este quiosque recebe direto na própria conta Mercado Pago
  // (split 1:1) -- o Mercado Pago não permite dividir 1 cobrança entre contas
  // diferentes, então um carrinho não pode misturar este quiosque com outro
  quiosqueRecebeDireto: boolean;
};

const EVENTO_ATUALIZACAO = "cathan:carrinho-atualizado";

function chave(eventoId: string) {
  return `cathan:carrinho:${eventoId}`;
}

function lerCarrinho(eventoId: string): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(chave(eventoId));
    return bruto ? (JSON.parse(bruto) as ItemCarrinho[]) : [];
  } catch {
    return [];
  }
}

function salvarCarrinho(eventoId: string, itens: ItemCarrinho[]) {
  window.localStorage.setItem(chave(eventoId), JSON.stringify(itens));
  window.dispatchEvent(new CustomEvent(EVENTO_ATUALIZACAO, { detail: { eventoId } }));
}

export type ResultadoAdicionar = { ok: true } | { ok: false; motivo: string };

export function adicionarAoCarrinho(
  eventoId: string,
  item: Omit<ItemCarrinho, "quantidade">,
  quantidade = 1
): ResultadoAdicionar {
  const itens = lerCarrinho(eventoId);

  const outroQuiosqueNoCarrinho = itens.find((i) => i.quiosqueId !== item.quiosqueId);
  if (outroQuiosqueNoCarrinho && (item.quiosqueRecebeDireto || outroQuiosqueNoCarrinho.quiosqueRecebeDireto)) {
    const quiosqueQueExige = item.quiosqueRecebeDireto ? item.quiosqueNome : outroQuiosqueNoCarrinho.quiosqueNome;
    return {
      ok: false,
      motivo: `"${quiosqueQueExige}" recebe direto na própria conta e por isso precisa de um pedido separado. Finalize ou esvazie o carrinho de "${outroQuiosqueNoCarrinho.quiosqueNome}" primeiro.`,
    };
  }

  const existente = itens.find((i) => i.produtoId === item.produtoId);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    itens.push({ ...item, quantidade });
  }
  salvarCarrinho(eventoId, itens);
  return { ok: true };
}

export function atualizarQuantidade(eventoId: string, produtoId: string, quantidade: number) {
  const itens = lerCarrinho(eventoId);
  const restantes =
    quantidade <= 0
      ? itens.filter((i) => i.produtoId !== produtoId)
      : itens.map((i) => (i.produtoId === produtoId ? { ...i, quantidade } : i));
  salvarCarrinho(eventoId, restantes);
}

export function limparCarrinho(eventoId: string) {
  salvarCarrinho(eventoId, []);
}

export function calcularTotal(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
}

export function agruparPorQuiosque(itens: ItemCarrinho[]) {
  const grupos = new Map<string, ItemCarrinho[]>();
  for (const item of itens) {
    const grupo = grupos.get(item.quiosqueId) ?? [];
    grupo.push(item);
    grupos.set(item.quiosqueId, grupo);
  }
  return [...grupos.values()];
}

/** Hook client-side: mantém o carrinho de um evento sincronizado com o localStorage. */
export function useCarrinho(eventoId: string) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const recarregar = useCallback(() => {
    setItens(lerCarrinho(eventoId));
  }, [eventoId]);

  useEffect(() => {
    recarregar();
    window.addEventListener(EVENTO_ATUALIZACAO, recarregar);
    window.addEventListener("storage", recarregar);
    return () => {
      window.removeEventListener(EVENTO_ATUALIZACAO, recarregar);
      window.removeEventListener("storage", recarregar);
    };
  }, [recarregar]);

  return itens;
}
