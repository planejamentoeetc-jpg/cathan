"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CampoSenha } from "@/components/CampoSenha";

export default function EntrarAdmin() {
  return (
    <Suspense fallback={null}>
      <EntrarAdminConteudo />
    </Suspense>
  );
}

function EntrarAdminConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/admin/entrar", {
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
      const destino = searchParams.get("redirect") ?? "/admin";
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
        Console Cathan
      </div>

      <div className="cartao">
        <p className="texto-fraco" style={{ marginBottom: 12 }}>
          Acesso exclusivo da equipe Cathan.
        </p>
        <CampoSenha
          label="Senha"
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
