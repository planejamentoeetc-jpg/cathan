"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CampoSenha } from "@/components/CampoSenha";
import { SenhaOculta } from "@/components/SenhaOculta";

// Deixa o gestor definir/trocar/remover a senha PRÓPRIA de um quiosque
// independente -- diferente da senha geral do evento, essa senha só abre o
// painel DESSE restaurante específico, pra um não conseguir ver o outro.
export function DefinirSenhaQuiosque({
  apiUrl,
  temSenhaInicial,
}: {
  apiUrl: string; // /api/eventos/{eventoId}/quiosques/{quiosqueId}/senha
  temSenhaInicial: boolean;
}) {
  const router = useRouter();
  const [temSenha, setTemSenha] = useState(temSenhaInicial);
  const [senha, setSenha] = useState("");
  const [senhaSalva, setSenhaSalva] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar a senha.");
        setEnviando(false);
        return;
      }
      setSenhaSalva(senha);
      setSenha("");
      setTemSenha(true);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    if (!confirm("Remover a senha própria? O restaurante volta a usar a senha geral do evento até você definir outra.")) {
      return;
    }
    setEnviando(true);
    try {
      const resposta = await fetch(apiUrl, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? "Não foi possível remover a senha.");
        return;
      }
      setTemSenha(false);
      setSenhaSalva(null);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <p className="texto-fraco" style={{ marginBottom: 14 }}>
        Senha própria pra esse restaurante entrar no painel dele — sem ela, ele usaria a mesma
        senha geral do evento de qualquer outro quiosque, o que deixaria os dados de restaurantes
        diferentes visíveis uns pros outros.
      </p>

      <div className="g-row" style={{ marginBottom: 14 }}>
        Status
        <span className="val" style={{ color: temSenha ? "var(--verde)" : "var(--festa)" }}>
          {temSenha ? "✓ senha própria definida" : "usando a senha geral do evento"}
        </span>
      </div>

      {senhaSalva && (
        <div className="aviso" style={{ marginBottom: 14, borderColor: "var(--verde)", background: "var(--verde-suave)", color: "var(--verde)" }}>
          ✓ Senha salva! Anote agora — ela não aparece de novo depois:
          <div style={{ marginTop: 8 }}>
            <SenhaOculta rotulo="Senha do restaurante" senha={senhaSalva} />
          </div>
        </div>
      )}

      <CampoSenha
        label={temSenha ? "Trocar a senha" : "Definir uma senha"}
        value={senha}
        onChange={setSenha}
        onKeyDown={(e) => e.key === "Enter" && salvar()}
      />

      {erro && (
        <div className="aviso" style={{ marginBottom: 10 }}>
          {erro}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn btn-primario" disabled={enviando || !senha} onClick={salvar}>
          {enviando ? "Salvando…" : temSenha ? "Trocar senha" : "Definir senha"}
        </button>
        {temSenha && (
          <button type="button" className="btn btn-secundario" disabled={enviando} onClick={remover} style={{ color: "#B4441C" }}>
            Remover senha própria
          </button>
        )}
      </div>
    </div>
  );
}
