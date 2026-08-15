"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cronometro } from "@/components/Cronometro";

const INTERVALO_POLLING_MS = 3000;
// um blip isolado (rede, banco "acordando") não deveria assustar o operador com um
// aviso vermelho — só mostra erro depois de falhar algumas vezes seguidas, sinal de
// que é um problema de verdade, não um soluço passageiro.
const FALHAS_CONSECUTIVAS_PARA_MOSTRAR_ERRO = 3;

type StatusFila = "RECEBIDO" | "ACEITO" | "PRONTO" | "CHAMADO" | "APROVEITANDO";
type Modalidade = "ALIMENTACAO" | "BEBIDAS" | "BRINCADEIRAS";

type ItemFila = {
  nome: string;
  quantidade: number;
  quantidadeTotal: number;
  observacao: string | null;
  nomesCriancas: string[];
};

type SubPedidoFila = {
  id: string;
  status: StatusFila;
  codigoRetirada: string;
  rodada: number;
  clienteNome: string;
  clienteACaminho: boolean;
  nomesCriancas: string[];
  duracaoMinutos: number;
  inicioAproveitamentoEm: string | null;
  itens: ItemFila[];
};

type RespostaFila = {
  quiosque: { id: string; nome: string; modalidade: Modalidade };
  pedidos: SubPedidoFila[];
};

type ItemBusca = { nome: string; quantidade: number; quantidadeLiberada: number };

type SubPedidoBusca = {
  id: string;
  status: string;
  codigoRetirada: string;
  criadoEm: string;
  clienteNome: string;
  clienteCelular: string;
  aguardandoLiberacao: boolean;
  itens: ItemBusca[];
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

const ROTULO_STATUS: Record<string, string> = {
  RECEBIDO: "Novo",
  ACEITO: "Em produção",
  PRONTO: "Pronto",
  CHAMADO: "Chamado",
  APROVEITANDO: "Aproveitando",
  RETIRADO: "Retirado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function FilaQuiosque({ quiosqueId }: { quiosqueId: string }) {
  const [dados, setDados] = useState<RespostaFila | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const falhasConsecutivasRef = useRef(0);

  // busca ampla (nome, celular ou código) -- ao contrário da fila normal,
  // encontra QUALQUER pedido deste quiosque, mesmo os que ainda não aparecem
  // nela (compra em quantidade ainda segurada pelo cliente) ou já retirados.
  // Dá autonomia pro quiosque investigar sozinho um "não achei meu pedido".
  const [busca, setBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<SubPedidoBusca[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  const carregarFila = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/quiosques/${quiosqueId}/fila`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Não foi possível carregar a fila.");
      setDados(await resposta.json());
      falhasConsecutivasRef.current = 0;
      setErro(null);
    } catch (e) {
      falhasConsecutivasRef.current += 1;
      if (falhasConsecutivasRef.current >= FALHAS_CONSECUTIVAS_PARA_MOSTRAR_ERRO) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar a fila.");
      }
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

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultadosBusca(null);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const timeout = setTimeout(async () => {
      try {
        const resposta = await fetch(`/api/quiosques/${quiosqueId}/busca?q=${encodeURIComponent(termo)}`, {
          cache: "no-store",
        });
        if (!resposta.ok || cancelado) return;
        const dados = await resposta.json();
        if (!cancelado) setResultadosBusca(dados.pedidos);
      } catch {
        // silencioso -- próxima digitação tenta de novo
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [busca, quiosqueId]);

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
  const emBusca = busca.trim().length >= 2;

  return (
    <div>
      <div className="campo" style={{ marginBottom: 16 }}>
        <label>Buscar um pedido (nome, celular ou código) — inclusive os que ainda não aparecem na fila</label>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: Haroldo, (31) 98418-9242 ou BE101"
        />
      </div>

      {erro && <div className="aviso" style={{ marginBottom: 14 }}>{erro}</div>}

      {emBusca ? (
        <div className="lista">
          {buscando && !resultadosBusca && <p className="texto-fraco">Buscando…</p>}

          {resultadosBusca?.length === 0 && (
            <p className="texto-fraco">Nenhum pedido encontrado com esse termo neste quiosque.</p>
          )}

          {resultadosBusca?.map((sp) => (
            <div key={sp.id} className="cartao">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontFamily: "var(--font-sora)" }}>{sp.clienteNome}</b>
                <span className="badge-status">{ROTULO_STATUS[sp.status] ?? sp.status}</span>
              </div>
              <div className="texto-fraco" style={{ fontSize: 12.5, marginTop: 2 }}>
                {sp.clienteCelular} · {formatarDataHora(sp.criadoEm)}
              </div>

              {sp.aguardandoLiberacao && (
                <div className="aviso" style={{ marginTop: 8, fontSize: 12.5 }}>
                  ⚠ Ainda segurado pelo cliente — ele comprou em quantidade e ainda não liberou
                  nenhuma unidade pra produção. É por isso que não aparece na fila normal.
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                {sp.itens.map((item, idx) => (
                  <div key={idx} style={{ fontSize: 13.5 }}>
                    {item.quantidadeLiberada}/{item.quantidade}× {item.nome}
                  </div>
                ))}
              </div>

              <div className="mono texto-fraco" style={{ marginTop: 8 }}>
                Código: <strong>{sp.codigoRetirada}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
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
                    <b style={{ fontFamily: "var(--font-sora)" }}>
                      {nomeExibido}
                      {sp.rodada > 1 && (
                        <span className="texto-fraco" style={{ fontWeight: 400, fontSize: 12 }}> · {sp.rodada}ª retirada</span>
                      )}
                    </b>
                    <span className={`badge-status ${sp.status === "RECEBIDO" ? "recebido" : destaque ? "pronto" : ""}`}>
                      {ROTULO_STATUS[sp.status]}
                    </span>
                  </div>

                  {sp.clienteACaminho && (sp.status === "PRONTO" || sp.status === "CHAMADO") && (
                    <div style={{ marginTop: 8 }}>
                      <span className="destaque-piscante">🚶 Cliente a caminho da retirada</span>
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    {sp.itens.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 13.5 }}>
                        {item.quantidade}× {item.nome}
                        {item.quantidade < item.quantidadeTotal && (
                          <span className="texto-fraco"> (de {item.quantidadeTotal} — resto ainda com o cliente)</span>
                        )}
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
        </>
      )}
    </div>
  );
}
