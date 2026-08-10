"use client";

import Link from "next/link";
import { useCarrinho } from "@/lib/cart";

export function DicaLoja({
  eventoId,
  quiosqueId,
  dica,
  parceiro,
}: {
  eventoId: string;
  quiosqueId: string;
  dica: string | null;
  parceiro: { id: string; nome: string; cor: string } | null;
}) {
  const itens = useCarrinho(eventoId);
  const temDoQuiosque = itens.some((i) => i.quiosqueId === quiosqueId);
  const temDoParceiro = parceiro ? itens.some((i) => i.quiosqueId === parceiro.id) : false;
  const mostrarCombo = Boolean(parceiro) && temDoQuiosque && !temDoParceiro;

  if (mostrarCombo && parceiro) {
    return (
      <div className="dica-spot" style={{ borderColor: parceiro.cor }}>
        <span className="ic">🥤</span>
        <span>
          O que você pegou aqui combina muito bem com algo de <b>{parceiro.nome}</b>!{" "}
          <Link href={`/e/${eventoId}/q/${parceiro.id}`} className="ir" style={{ color: parceiro.cor }}>
            Dar uma olhada ›
          </Link>
        </span>
      </div>
    );
  }

  if (dica) {
    return (
      <div className="dica-spot" style={{ borderColor: "var(--linha)" }}>
        <span className="ic">💡</span>
        <span>{dica}</span>
      </div>
    );
  }

  return null;
}
