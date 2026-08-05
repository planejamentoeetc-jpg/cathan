"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cronometro } from "@/components/Cronometro";

const INTERVALO_POLLING_MS = 3000;

type StatusFila = "RECEBIDO" | "ACEITO" | "PRONTO" | "CHAMADO" | "APROVEITANDO";
type Modalidade = "ALIMENTACAO" | "BEBIDAS" | "BRINCADEIRAS";

type ItemFila = {
  nome: string;
  quantidade: number;
  observacao: string | null;
  nomesCriancas: string[];
};

type SubPedidoFila = {
  id: string;
  status: StatusFila;
  codigoRetirada: string;
  clienteNome: string;
  nomesCriancas: string[];
  duracaoMinutos: number;
  inicioAproveitamentoEm: string | null;
  itens: ItemFila[];
};

type RespostaFila = {
  quiosque: { id: string; nome: string; modalidade: Modalidade };
  pedidos: SubPedidoFila[];
};

const ACAO_COMIDA: Partial<Record<StatusFila, { rota: string; rotulo: string }>> = {
  RECEBIDO: { rota: "aceitar", rotulo: "Aceitar pedido" },
  ACEITO: { rota: "pronto", rotulo: "Pedido pronto" },
  PRONTO: { rota: "entregar", rotulo: "Código conferido — entregue" },
};

const ACAO_BRINCADEIRAS: Partial<Record<StatusFila, { rota: string; rotulo: string }>> = {
  RECEBIDO: { rota: "chamar", rotulo: "Chamar" },
  CHAMADO: { rota: "iniciar", rotulo: "Começou a aproveitar" },
  APROVEITANDO: { rota: "concluir", rotulo: "Concluir" },
};

const ROTULO_STATUS: Record<StatusFila, string> = {
  RECEBIDO: "Novo",
  ACEITO: "Em produção",
  PRONTO: "Pronto",
  CHAMADO: "Chamado",
  APROVEITANDO: "Aproveitando",
};

export default function PainelQuiosque() {
  const { eventoId, quiosqueId } = useParams<{ eventoId: string; quiosqueId: string }>();
  const [dados, setDados] = useState<RespostaFila | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregarFila = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/quiosques/${quiosqueId}/fila`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Não foi possível carregar a fila.");
      setDados(await resposta.json());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar a fila.");
    } finally {
      setCarregando(false);
    }
  }, [quiosqueId]);

  useEffect(() => {
    carregarFila();
    intervaloRef.current = setInterval(carregarFila, INTERVALO_POLLING_MS);
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [carregarFila]);

  async function executarAcao(subPedidoId: string, rota: string) {
    setAcaoEmAndamento(subPedidoId);
    try {
      const resposta = await fetch(`/api/sub-pedidos/${subPedidoId}/${rota}`, { method: "POST" });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErro(corpo.erro ?? "Não foi possível atualizar o pedido.");
        return;
      }
      await carregarFila();
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  const ehBrincadeiras = dados?.quiosque.modalidade === "BRINCADEIRAS";
  const mapaAcoes = ehBrincadeiras ? ACAO_BRINCADEIRAS : ACAO_COMIDA;

  return (
    <main className="tela" style={{ maxWidth: 720 }}>
      <div
        className="topo"
        style={{
          borderRadius: 18,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span>{dados?.quiosque.nome ?? "Painel"} — fila</span>
        <div style={{ display: "flex", gap: 14 }}>
          <Link href={`/painel/${eventoId}/q/${quiosqueId}/produtos`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
            Produtos
          </Link>
          <Link href={`/painel/${eventoId}/quiosques`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
            Trocar quiosque
          </Link>
        </div>
      </div>

      {erro && <div className="aviso" style={{ marginBottom: 14 }}>{erro}</div>}

      {!carregando && dados?.pedidos.length === 0 && (
        <p className="texto-fraco">
          Nenhum pedido na fila agora. Assim que um cliente fechar um pedido, ele aparece aqui
          automaticamente.
        </p>
      )}

      <div className="lista">
        {dados?.pedidos.map((sp) => {
          const acao = mapaAcoes[sp.status];
          const destaque = sp.status === "PRONTO" || sp.status === "CHAMADO";
          const nomeExibido = ehBrincadeiras
            ? sp.nomesCriancas[0] ?? sp.clienteNome
            : sp.clienteNome;

          return (
            <div key={sp.id} className="cartao">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontFamily: "var(--font-sora)" }}>{nomeExibido}</b>
                <span className={`badge-status ${sp.status === "RECEBIDO" ? "recebido" : destaque ? "pronto" : ""}`}>
                  {ROTULO_STATUS[sp.status]}
                </span>
              </div>

              <div style={{ marginTop: 10 }}>
                {sp.itens.map((item, idx) => (
                  <div key={idx} style={{ fontSize: 13.5 }}>
                    {item.quantidade}× {item.nome}
                    {item.observacao && (
                      <strong style={{ color: "var(--festa)" }}> — {item.observacao}</strong>
                    )}
                  </div>
                ))}
              </div>

              {ehBrincadeiras && sp.nomesCriancas.length > 0 && (
                <div
                  className={destaque ? "destaque-piscante" : ""}
                  style={{ marginTop: 8, fontWeight: 800, fontSize: destaque ? 16 : 13.5 }}
                >
                  Chamar: {sp.nomesCriancas.join(", ")}
                </div>
              )}

              {sp.status === "APROVEITANDO" && sp.inicioAproveitamentoEm && (
                <div style={{ marginTop: 8 }}>
                  Tempo restante:{" "}
                  <Cronometro
                    inicioEm={sp.inicioAproveitamentoEm}
                    duracaoMinutos={sp.duracaoMinutos}
                    className="mono"
                  />
                </div>
              )}

              <div className="mono texto-fraco" style={{ marginTop: 8 }}>
                Código: <strong>{sp.codigoRetirada}</strong>
              </div>

              {acao && (
                <button
                  type="button"
                  className="btn btn-primario btn-bloco"
                  style={{ marginTop: 12 }}
                  disabled={acaoEmAndamento === sp.id}
                  onClick={() => executarAcao(sp.id, acao.rota)}
                >
                  {acaoEmAndamento === sp.id ? "Atualizando…" : acao.rotulo}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
