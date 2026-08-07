"use client";

import Link from "next/link";
import { useState } from "react";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  ativo: boolean;
};

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ListaProdutosPainel({
  eventoId,
  quiosqueId,
  produtos: produtosIniciais,
}: {
  eventoId: string;
  quiosqueId: string;
  produtos: Produto[];
}) {
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
      <Link href={`/painel/${eventoId}/q/${quiosqueId}/produtos/novo`} className="btn btn-primario btn-bloco">
        + Novo produto
      </Link>

      {produtos.map((produto) => (
        <div key={produto.id} className="cartao" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Link
              href={`/painel/${eventoId}/q/${quiosqueId}/produtos/${produto.id}/editar`}
              style={{ fontWeight: 700 }}
            >
              {produto.nome}
            </Link>
            <div className="texto-fraco">{formatarReais(produto.preco)}</div>
          </div>
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
