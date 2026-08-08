"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Evento = {
  id: string;
  nome: string;
  local: string;
  emAndamento: boolean;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function BuscaEventos({ eventos }: { eventos: Evento[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return eventos;
    return eventos.filter(
      (e) => normalizar(e.nome).includes(termo) || normalizar(e.local).includes(termo)
    );
  }, [eventos, busca]);

  const emAndamento = filtrados.filter((e) => e.emAndamento);
  const outros = filtrados.filter((e) => !e.emAndamento);

  return (
    <>
      <div className="campo">
        <input
          type="text"
          placeholder="Buscar pelo nome do evento ou local…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />
      </div>

      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 10 }}>
        Em andamento agora
      </b>
      <div className="lista" style={{ marginBottom: 24 }}>
        {emAndamento.map((evento) => (
          <Link key={evento.id} href={`/e/${evento.id}`} className="cartao">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontFamily: "var(--font-sora)" }}>{evento.nome}</b>
              <span className="badge-status pronto">Ao vivo</span>
            </div>
            <div className="texto-fraco">{evento.local}</div>
          </Link>
        ))}
        {emAndamento.length === 0 && (
          <p className="texto-fraco">Nenhum evento em andamento neste momento.</p>
        )}
      </div>

      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 10 }}>
        Outros eventos
      </b>
      <div className="lista">
        {outros.map((evento) => (
          <Link key={evento.id} href={`/e/${evento.id}`} className="cartao">
            <b style={{ fontFamily: "var(--font-sora)" }}>{evento.nome}</b>
            <div className="texto-fraco">{evento.local}</div>
          </Link>
        ))}
        {outros.length === 0 && <p className="texto-fraco">Nenhum outro evento encontrado.</p>}
      </div>
    </>
  );
}
