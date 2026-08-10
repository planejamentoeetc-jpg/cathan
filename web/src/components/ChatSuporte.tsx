"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mensagem = {
  id: string;
  de: "GESTOR" | "CATHAN";
  texto: string;
  criadoEm: string;
};

const INTERVALO_POLLING_MS = 5000;

export function ChatSuporte({
  apiUrl,
  remetente,
  placeholder,
  rotuloEnviar,
}: {
  apiUrl: string;
  remetente: "GESTOR" | "CATHAN";
  placeholder: string;
  rotuloEnviar: string;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(apiUrl, { cache: "no-store" });
      if (resposta.ok) setMensagens(await resposta.json());
    } catch {
      // silencioso — atualiza de novo no próximo ciclo
    }
  }, [apiUrl]);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_POLLING_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  useEffect(() => {
    caixaRef.current?.scrollTo({ top: caixaRef.current.scrollHeight });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const resposta = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim() }),
      });
      if (resposta.ok) {
        setTexto("");
        await carregar();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="chatbox" ref={caixaRef}>
        {mensagens.length === 0 && <p className="texto-fraco">Nenhuma mensagem ainda.</p>}
        {mensagens.map((m) => (
          <div key={m.id} className={`msg ${m.de === remetente ? "enviada" : "recebida"}`}>
            {m.texto}
            <span className="h">
              {m.de === "GESTOR" ? "Gestor do evento" : "Suporte Cathan"} ·{" "}
              {new Date(m.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder={placeholder}
          style={{ flex: 1, border: "1.5px solid var(--linha)", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
        />
        <button type="button" className="btn btn-secundario" disabled={enviando || !texto.trim()} onClick={enviar}>
          {rotuloEnviar}
        </button>
      </div>
    </>
  );
}
