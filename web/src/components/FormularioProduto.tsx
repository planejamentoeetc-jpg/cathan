"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProdutoInicial = {
  id: string;
  nome: string;
  preco: number;
  tempoProducaoMinutos: number;
  estoque: number | null;
};

export function FormularioProduto({
  eventoId,
  quiosqueId,
  rotuloTempo,
  produtoInicial,
}: {
  eventoId: string;
  quiosqueId: string;
  rotuloTempo: string;
  produtoInicial?: ProdutoInicial;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(produtoInicial?.nome ?? "");
  const [preco, setPreco] = useState(produtoInicial ? String(produtoInicial.preco) : "");
  const [tempo, setTempo] = useState(String(produtoInicial?.tempoProducaoMinutos ?? 0));
  const [semEstoque, setSemEstoque] = useState(
    produtoInicial ? produtoInicial.estoque === null : true
  );
  const [estoque, setEstoque] = useState(
    produtoInicial?.estoque !== null && produtoInicial?.estoque !== undefined
      ? String(produtoInicial.estoque)
      : ""
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const voltar = `/painel/${eventoId}/q/${quiosqueId}/produtos`;

  async function salvar() {
    setErro(null);

    const precoNumero = Number(preco.replace(",", "."));
    const tempoNumero = Number(tempo);
    const estoqueNumero = semEstoque ? null : Number(estoque);

    if (!nome.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }
    if (!(precoNumero > 0)) {
      setErro("Informe um preço válido.");
      return;
    }
    if (!Number.isInteger(tempoNumero) || tempoNumero < 0) {
      setErro(`Informe um valor válido para "${rotuloTempo}".`);
      return;
    }
    if (!semEstoque && (!Number.isInteger(estoqueNumero) || estoqueNumero! < 0)) {
      setErro("Informe um estoque válido, ou marque como ilimitado.");
      return;
    }

    setEnviando(true);
    try {
      const corpo = {
        nome: nome.trim(),
        preco: precoNumero,
        tempoProducaoMinutos: tempoNumero,
        estoque: estoqueNumero,
      };

      const resposta = produtoInicial
        ? await fetch(`/api/produtos/${produtoInicial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          })
        : await fetch(`/api/quiosques/${quiosqueId}/produtos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o produto.");
        setEnviando(false);
        return;
      }

      router.push(voltar);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao salvar.");
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <div className="campo">
        <label>Nome do produto</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>

      <div className="campo">
        <label>Preço (R$)</label>
        <input
          type="text"
          inputMode="decimal"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="0,00"
        />
      </div>

      <div className="campo">
        <label>{rotuloTempo}</label>
        <input
          type="number"
          min={0}
          value={tempo}
          onChange={(e) => setTempo(e.target.value)}
        />
        <span className="texto-fraco">0 = pronta entrega</span>
      </div>

      <div className="campo">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input
            type="checkbox"
            checked={semEstoque}
            onChange={(e) => setSemEstoque(e.target.checked)}
          />
          Sem controle de estoque (ilimitado)
        </label>
        {!semEstoque && (
          <input
            type="number"
            min={0}
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
            placeholder="Quantidade em estoque"
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      {erro && (
        <div className="aviso" style={{ marginBottom: 10 }}>
          {erro}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primario btn-bloco"
        disabled={enviando}
        onClick={salvar}
      >
        {enviando ? "Salvando…" : produtoInicial ? "Salvar alterações" : "Criar produto"}
      </button>
    </div>
  );
}
