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
  criarUrl,
  editarUrlBase,
  alternarAtivoUrlBase,
  excluirUrlBase,
}: {
  eventoId: string;
  quiosqueId: string;
  produtos: Produto[];
  // por padrão aponta pras telas/API do painel do quiosque (senha do quiosque); o
  // painel do gestor passa suas próprias URLs (senha do gestor) pra reusar esta lista
  criarUrl?: string;
  editarUrlBase?: string;
  alternarAtivoUrlBase?: string;
  excluirUrlBase?: string;
}) {
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<{ id: string; mensagem: string } | null>(null);

  async function alternar(id: string) {
    setEmAndamento(id);
    try {
      const resposta = await fetch(`${alternarAtivoUrlBase ?? "/api/produtos"}/${id}/alternar-ativo`, {
        method: "POST",
      });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      setProdutos((atual) => atual.map((p) => (p.id === id ? { ...p, ativo: dados.ativo } : p)));
    } finally {
      setEmAndamento(null);
    }
  }

  async function excluir(id: string) {
    setErroExclusao(null);
    setEmAndamento(id);
    try {
      const resposta = await fetch(`${excluirUrlBase ?? "/api/produtos"}/${id}`, { method: "DELETE" });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroExclusao({ id, mensagem: dados.erro ?? "Não foi possível excluir o produto." });
        setConfirmandoId(null);
        return;
      }
      setProdutos((atual) => atual.filter((p) => p.id !== id));
    } finally {
      setEmAndamento(null);
    }
  }

  return (
    <div className="lista">
      <Link
        href={criarUrl ?? `/painel/${eventoId}/q/${quiosqueId}/produtos/novo`}
        className="btn btn-primario btn-bloco"
      >
        + Novo produto
      </Link>

      {produtos.map((produto) => (
        <div key={produto.id} className="cartao">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700 }}>{produto.nome}</span>
              <div className="texto-fraco">{formatarReais(produto.preco)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Link
                href={editarUrlBase ? `${editarUrlBase}/${produto.id}/editar` : `/painel/${eventoId}/q/${quiosqueId}/produtos/${produto.id}/editar`}
                className="btn btn-secundario"
              >
                Editar
              </Link>
              <button
                type="button"
                className={produto.ativo ? "btn btn-secundario" : "btn btn-primario"}
                disabled={emAndamento === produto.id}
                onClick={() => alternar(produto.id)}
              >
                {emAndamento === produto.id ? "…" : produto.ativo ? "Esgotar" : "Reativar"}
              </button>
            </div>
          </div>

          {confirmandoId === produto.id ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secundario"
                style={{ flex: 1, padding: "6px 10px", fontSize: 12.5 }}
                onClick={() => setConfirmandoId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: 12.5,
                  borderRadius: 8,
                  background: "#D64545",
                  color: "#fff",
                  fontWeight: 700,
                }}
                disabled={emAndamento === produto.id}
                onClick={() => excluir(produto.id)}
              >
                {emAndamento === produto.id ? "Excluindo…" : "Confirmar exclusão"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmandoId(produto.id);
                setErroExclusao(null);
              }}
              style={{ marginTop: 8, fontSize: 12, color: "#B4441C", textDecoration: "underline" }}
            >
              Excluir produto
            </button>
          )}

          {erroExclusao?.id === produto.id && (
            <div className="aviso" style={{ marginTop: 8, fontSize: 12.5 }}>
              {erroExclusao.mensagem}
            </div>
          )}
        </div>
      ))}

      {produtos.length === 0 && (
        <p className="texto-fraco">Nenhum produto cadastrado neste quiosque ainda.</p>
      )}
    </div>
  );
}
