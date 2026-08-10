"use client";

import { useState } from "react";
import type { ModalidadeQuiosque } from "@prisma/client";
import { adicionarAoCarrinho } from "@/lib/cart";
import { IconeModalidade } from "./IconeModalidade";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  tempoProducaoMinutos: number;
  estoque: number | null;
  ativo: boolean;
};

type QuiosqueResumo = {
  id: string;
  nome: string;
  cor: string;
  modalidade: ModalidadeQuiosque;
};

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarTempo(minutos: number, modalidade: ModalidadeQuiosque) {
  if (minutos <= 0) return "Pronta entrega";
  return modalidade === "BRINCADEIRAS" ? `${minutos} min de duração` : `${minutos} min de preparo`;
}

export function ProdutoCard({
  eventoId,
  produto,
  quiosque,
}: {
  eventoId: string;
  produto: Produto;
  quiosque: QuiosqueResumo;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [adicionado, setAdicionado] = useState(false);

  const disponivel = produto.ativo && (produto.estoque === null || produto.estoque > 0);

  function adicionar() {
    adicionarAoCarrinho(
      eventoId,
      {
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        observacao: observacao.trim() || undefined,
        quiosqueId: quiosque.id,
        quiosqueNome: quiosque.nome,
        quiosqueCor: quiosque.cor,
        quiosqueModalidade: quiosque.modalidade,
      },
      quantidade
    );
    setQuantidade(1);
    setObservacao("");
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 1200);
  }

  return (
    <div className="produto-card" style={{ opacity: disponivel ? 1 : 0.55 }}>
      <div className="produto-icone" style={{ background: quiosque.cor }}>
        <IconeModalidade modalidade={quiosque.modalidade} tamanho={30} />
      </div>
      <div className="produto-corpo">
        <div className="produto-nome">{produto.nome}</div>
        <div className="produto-preco">{formatarReais(produto.preco)}</div>
        <div className="produto-tempo">
          {disponivel
            ? formatarTempo(produto.tempoProducaoMinutos, quiosque.modalidade)
            : "Esgotado"}
        </div>

        {disponivel && (
          <>
            <input
              type="text"
              placeholder="Observação (opcional)"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{
                marginTop: 6,
                border: "1.5px solid var(--linha)",
                borderRadius: 8,
                padding: "6px 8px",
                fontSize: 12,
              }}
            />

            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  −
                </button>
                <span>{quantidade}</span>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => q + 1)}
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primario btn-bloco"
              style={{ marginTop: 8 }}
              onClick={adicionar}
            >
              {adicionado ? "Adicionado ✓" : "Adicionar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
