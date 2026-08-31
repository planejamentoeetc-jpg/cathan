"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CampoSenha } from "@/components/CampoSenha";

export default function EntrarQuiosque() {
  return (
    <Suspense fallback={null}>
      <EntrarQuiosqueConteudo />
    </Suspense>
  );
}

function EntrarQuiosqueConteudo() {
  const router = useRouter();
  const params = useParams<{ eventoId: string; quiosqueId: string }>();
  const searchParams = useSearchParams();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/quiosques/${params.quiosqueId}/entrar`, {
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
      const destino = searchParams.get("redirect") ?? `/painel/${params.eventoId}/q/${params.quiosqueId}`;
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
        Painel do restaurante
      </div>

      <div className="cartao">
        <p className="texto-fraco" style={{ marginBottom: 14 }}>
          Este restaurante é independente — usa a senha própria dele, diferente da senha geral do
          evento. Peça a senha pra quem organiza o evento se ainda não tiver a sua.
        </p>

        <CampoSenha
          label="Senha do restaurante"
          value={senha}
          onChange={setSenha}
          onKeyDown={(e) => e.key === "Enter" && entrar()}
          autoFocus
        />

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
