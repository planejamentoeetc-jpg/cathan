"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FormularioComissaoEvento({
  eventoId,
  comissaoInicial,
  comissaoOrganizadorInicial,
}: {
  eventoId: string;
  comissaoInicial: number;
  comissaoOrganizadorInicial: number;
}) {
  const router = useRouter();
  const [comissao, setComissao] = useState(String(comissaoInicial));
  const [comissaoOrganizador, setComissaoOrganizador] = useState(String(comissaoOrganizadorInicial));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvo(false);

    const valor = Number(comissao.replace(",", "."));
    const valorOrganizador = Number(comissaoOrganizador.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      setErro("Informe uma % entre 0 e 100 pra comissão da Cathan.");
      return;
    }
    if (!Number.isFinite(valorOrganizador) || valorOrganizador < 0 || valorOrganizador > 100) {
      setErro("Informe uma % entre 0 e 100 pra comissão do organizador.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/admin/eventos/${eventoId}/comissao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comissaoPercentual: valor, comissaoOrganizadorPercentual: valorOrganizador }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="campo">
        <label>% de comissão da Cathan neste evento</label>
        <input
          type="text"
          inputMode="decimal"
          value={comissao}
          onChange={(e) => {
            setComissao(e.target.value);
            setSalvo(false);
          }}
          style={{ maxWidth: 100 }}
        />
      </div>

      <div className="campo">
        <label>% de comissão do organizador sobre os restaurantes independentes</label>
        <input
          type="text"
          inputMode="decimal"
          value={comissaoOrganizador}
          onChange={(e) => {
            setComissaoOrganizador(e.target.value);
            setSalvo(false);
          }}
          style={{ maxWidth: 100 }}
        />
        <p className="texto-fraco" style={{ marginTop: 4, fontSize: 12 }}>
          Só é aplicada quando há restaurante independente com Pagar.me conectado no carrinho e o
          organizador também tem recebedor Pagar.me próprio (em /gestor/conexoes). Num evento de
          instituição única, o organizador já recebe o valor inteiro e esse campo não muda nada.
        </p>
      </div>

      <div>
        <button type="button" className="btn btn-primario" disabled={enviando} onClick={salvar}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {salvo && (
        <p className="texto-fraco" style={{ color: "var(--verde)" }}>
          ✓ Comissões atualizadas.
        </p>
      )}
      {erro && <div className="aviso">{erro}</div>}
    </div>
  );
}
