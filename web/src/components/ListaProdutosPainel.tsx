"use client";

import { useState } from "react";

type Produto = {
  id: string;
  nome: string;
  ativo: boolean;
};

export function ListaProdutosPainel({ produtos: produtosIniciais }: { produtos: Produto[] }) {
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);

  async function alternar(id: string) {
    setEmAndamento(id);
    try {
      const resposta = await fetch(`/api/produtos/${id}/alternar-ativo`, { method: "POST" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      setProdutos((atual) => atual.map((p) => (p.id === id ? { ...p, ativo: dados.ativo } : p)));
    } finally {
      setEmAndamento(null);
    }
  }

  return (
    <div className="lista">
      {produtos.map((produto) => (
        <div
          key={produto.id}
          className="cartao"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontWeight: 700 }}>{produto.nome}</span>
          <button
            type="button"
            className={produto.ativo ? "btn btn-secundario" : "btn btn-primario"}
            disabled={emAndamento === produto.id}
            onClick={() => alternar(produto.id)}
          >
            {emAndamento === produto.id ? "…" : produto.ativo ? "Esgotar" : "Reativar"}
          </button>
        </div>
      ))}

      {produtos.length === 0 && (
        <p className="texto-fraco">Nenhum produto cadastrado neste quiosque ainda.</p>
      )}
    </div>
  );
}
