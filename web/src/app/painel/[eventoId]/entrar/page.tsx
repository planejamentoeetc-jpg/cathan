"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState } from "react";

export default function EntrarPainel() {
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
      const resposta = await fetch("/api/painel/entrar", {
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
      const destino = searchParams.get("redirect") ?? `/painel/${params.eventoId}/quiosques`;
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
        Painel do quiosque
      </div>

      <div className="cartao">
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
