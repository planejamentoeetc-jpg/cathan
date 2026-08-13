"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Cronometro } from "@/components/Cronometro";

const INTERVALO_POLLING_MS = 3000;

type StatusTelao = "RECEBIDO" | "ACEITO" | "PRONTO" | "CHAMADO" | "APROVEITANDO";

type PedidoTelao = {
  id: string;
  status: StatusTelao;
  codigoRetirada: string;
  rodada: number;
  clienteNome: string;
  nomesCriancas: string[];
  duracaoMinutos: number;
  inicioAproveitamentoEm: string | null;
};

type QuiosqueTelao = {
  id: string;
  nome: string;
  cor: string;
  modalidade: "ALIMENTACAO" | "BEBIDAS" | "BRINCADEIRAS";
  pedidos: PedidoTelao[];
};

const ROTULO_STATUS: Record<StatusTelao, string> = {
  RECEBIDO: "Novo",
  ACEITO: "Em produção",
  PRONTO: "Pronto!",
  CHAMADO: "Chamado!",
  APROVEITANDO: "Aproveitando",
};

export default function TelaDePedidos() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [quiosques, setQuiosques] = useState<QuiosqueTelao[]>([]);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/tela-de-pedidos`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      setQuiosques(dados.quiosques);
    } catch {
      // silencioso: a próxima rodada de polling tenta de novo
    }
  }, [eventoId]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_POLLING_MS);
    return () => clearInterval(id);
  }, [carregar]);

  return (
    <div className="telao-wrap">
      <div className="telao-titulo">Fila dos quiosques</div>

      <div className="telao-colunas">
        {quiosques.map((q) => (
          <div key={q.id} className="telao-coluna">
            <div className="telao-coluna-titulo" style={{ color: q.cor }}>
              {q.nome}
            </div>

            {q.pedidos.length === 0 && <div className="telao-vazio">Sem pedidos na fila</div>}

            {q.pedidos.map((p) => {
              const destaque = p.status === "PRONTO" || p.status === "CHAMADO";
              const nomeExibido =
                q.modalidade === "BRINCADEIRAS" ? p.nomesCriancas[0] ?? p.clienteNome : p.clienteNome;

              return (
                <div key={p.id} className={`telao-card ${destaque ? "telao-card-destaque" : ""}`}>
                  <div className="telao-codigo">{p.codigoRetirada}</div>
                  <div className="telao-nome">
                    {nomeExibido}
                    {p.rodada > 1 && ` · ${p.rodada}ª retirada`}
                  </div>
                  <div className="telao-status">{ROTULO_STATUS[p.status]}</div>

                  {p.status === "APROVEITANDO" && p.inicioAproveitamentoEm && (
                    <div className="telao-status">
                      <Cronometro
                        inicioEm={p.inicioAproveitamentoEm}
                        duracaoMinutos={p.duracaoMinutos}
                        className="mono"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {quiosques.length === 0 && <p className="telao-vazio">Nenhum quiosque cadastrado neste evento.</p>}
      </div>
    </div>
  );
}
