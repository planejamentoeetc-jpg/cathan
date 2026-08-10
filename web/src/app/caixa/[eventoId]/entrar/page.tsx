"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function EntrarCaixa() {
  return (
    <Suspense fallback={null}>
      <EntrarCaixaConteudo />
    </Suspense>
  );
}

function EntrarCaixaConteudo() {
  const router = useRouter();
  const params = useParams<{ eventoId: string }>();
  const searchParams = useSearchParams();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/caixa/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? "Não foi possível entrar.");
        setEnviando(false);
        return;
      }
      const destino = searchParams.get("redirect") ?? `/caixa/${params.eventoId}`;
      router.push(destino);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao entrar.");
      setEnviando(false);
    }
  }

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Venda Manual — Caixa do Evento
      </div>

      <div className="cartao">
        <p className="texto-fraco" style={{ marginBottom: 12 }}>
          Acesso do operador autorizado para vendas em dinheiro e compras assistidas.
        </p>
        <div className="campo">
          <label>Senha do evento</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
            autoFocus
          />
        </div>

        {erro && (
          <div className="aviso" style={{ marginBottom: 10 }}>
            {erro}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primario btn-bloco"
          disabled={enviando || !senha}
          onClick={entrar}
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </main>
  );
}
