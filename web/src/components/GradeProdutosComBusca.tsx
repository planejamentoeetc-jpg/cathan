"use client";

import { useMemo, useState } from "react";
import type { ModalidadeQuiosque } from "@prisma/client";
import { ProdutoCard } from "./ProdutoCard";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  tempoProducaoMinutos: number;
  estoque: number | null;
  ativo: boolean;
  fotoUrl: string | null;
};

type QuiosqueResumo = {
  id: string;
  nome: string;
  cor: string;
  modalidade: ModalidadeQuiosque;
  recebeDireto: boolean;
};

export function GradeProdutosComBusca({
  eventoId,
  produtos,
  quiosque,
}: {
  eventoId: string;
  produtos: Produto[];
  quiosque: QuiosqueResumo;
}) {
  const [busca, setBusca] = useState("");

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [produtos, busca]);

  return (
    <>
      {/* cardápios pequenos não precisam de busca -- só atrapalha a tela */}
      {produtos.length > 4 && (
        <div className="loja-busca">
          <svg
            className="ic"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder={`Buscar no cardápio de ${quiosque.nome}`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      <div className="produtos-grid">
        {produtosFiltrados.map((produto) => (
          <ProdutoCard key={produto.id} eventoId={eventoId} produto={produto} quiosque={quiosque} />
        ))}

        {produtosFiltrados.length === 0 && (
          <p className="texto-fraco">
            {produtos.length === 0 ? "Nenhum produto cadastrado neste quiosque ainda." : "Nenhum produto encontrado pra essa busca."}
          </p>
        )}
      </div>
    </>
  );
}
