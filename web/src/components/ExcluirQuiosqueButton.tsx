"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExcluirQuiosqueButton({
  eventoId,
  quiosqueId,
  quiosqueNome,
}: {
  eventoId: string;
  quiosqueId: string;
  quiosqueNome: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/quiosques/${quiosqueId}`, {
        method: "DELETE",
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível excluir o quiosque.");
        setExcluindo(false);
        return;
      }
      router.push(`/gestor/eventos/${eventoId}`);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao excluir.");
      setExcluindo(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className="btn btn-secundario btn-bloco"
        style={{ color: "#B4441C", borderColor: "#FFD9C8" }}
        onClick={() => setAberto(true)}
      >
        Excluir quiosque
      </button>
    );
  }

  return (
    <div className="cartao" style={{ borderColor: "#FFD9C8" }}>
      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 6, color: "#B4441C" }}>
        Excluir "{quiosqueNome}"?
      </b>
      <p className="texto-fraco" style={{ marginBottom: 10 }}>
        Isso apaga o quiosque e todos os produtos dele. Só é possível se ainda não houver nenhum
        pedido pago registrado — essa ação não pode ser desfeita.
      </p>
      <div className="campo">
        <label>Digite "{quiosqueNome}" pra confirmar</label>
        <input type="text" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
      </div>

      {erro && (
        <div className="aviso" style={{ marginBottom: 10 }}>
          {erro}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-secundario"
          style={{ flex: 1 }}
          onClick={() => {
            setAberto(false);
            setConfirmacao("");
            setErro(null);
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn"
          style={{ flex: 1, background: "#D64545", color: "#fff" }}
          disabled={confirmacao !== quiosqueNome || excluindo}
          onClick={excluir}
        >
          {excluindo ? "Excluindo…" : "Excluir de vez"}
        </button>
      </div>
    </div>
  );
}
