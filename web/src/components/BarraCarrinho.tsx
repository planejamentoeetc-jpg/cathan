"use client";

import Link from "next/link";
import { calcularTotal, useCarrinho } from "@/lib/cart";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BarraCarrinho({ eventoId }: { eventoId: string }) {
  const itens = useCarrinho(eventoId);
  const totalItens = itens.reduce((soma, i) => soma + i.quantidade, 0);

  if (totalItens === 0) return null;

  return (
    <div className="barra-inferior">
      <Link href={`/e/${eventoId}/carrinho`} className="btn btn-primario btn-bloco">
        Ver carrinho · {totalItens} {totalItens === 1 ? "item" : "itens"} ·{" "}
        {formatarReais(calcularTotal(itens))}
      </Link>
    </div>
  );
}
