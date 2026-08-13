"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { STATUS_LABEL } from "@/lib/statusSubPedido";
import { ItemPager, PagerPronto } from "@/components/PagerPronto";
import { StatusPedidoStepper } from "@/components/StatusPedidoStepper";

type SubPedido = {
  id: string;
  status: keyof typeof STATUS_LABEL;
  codigoRetirada: string;
  quiosque: {
    id: string;
    nome: string;
    cor: string;
    modalidade: string;
    mensagemPreparando: string | null;
    mensagemPronto: string | null;
  };
  vocEProximo: boolean;
  itens: {
    id: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    observacao: string | null;
    nomesCriancas: string[];
    quantidadeLiberada: number;
  }[];
};

type Pedido = {
  id: string;
  criadoEm: string;
  subPedidos: SubPedido[];
};

const INTERVALO_POLLING_MS = 3000;

function chaveDispensados(pedidoId: string) {
  return `cathan:pager-dispensados:${pedidoId}`;
}

function lerDispensados(pedidoId: string): string[] {
  try {
    const bruto = window.localStorage.getItem(chaveDispensados(pedidoId));
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    return [];
  }
}

export default function Acompanhamento() {
  const { eventoId, pedidoId } = useParams<{ eventoId: string; pedidoId: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dispensados, setDispensados] = useState<string[]>([]);
  const [liberando, setLiberando] = useState<Set<string>>(new Set());
  // quantas unidades o cliente escolheu liberar agora, por item (default = tudo que resta)
  const [quantidadesEscolhidas, setQuantidadesEscolhidas] = useState<Record<string, number>>({});
  const idsJaAvisados = useRef<Set<string>>(new Set());
  // um blip isolado (rede, banco "acordando") não deveria assustar o cliente com um
  // aviso vermelho — só mostra erro depois de falhar algumas vezes seguidas.
  const falhasConsecutivasRef = useRef(0);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/pedidos/${pedidoId}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Pedido não encontrado.");
      setPedido(await resposta.json());
      falhasConsecutivasRef.current = 0;
      setErro(null);
    } catch (e) {
      falhasConsecutivasRef.current += 1;
      if (falhasConsecutivasRef.current >= 3) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar pedido.");
      }
    } finally {
      setCarregando(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    setDispensados(lerDispensados(pedidoId));
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_POLLING_MS);
    return () => clearInterval(intervalo);
  }, [carregar, pedidoId]);

  // some da tela assim que o quiosque marca como retirado/concluído — não há
  // mais nada que o cliente precise acompanhar ali
  const subPedidosAtivos = (pedido?.subPedidos ?? []).filter(
    (sp) => sp.status !== "RETIRADO" && sp.status !== "CONCLUIDO"
  );

  const prontos = subPedidosAtivos.filter(
    (sp) => (sp.status === "PRONTO" || sp.status === "CHAMADO") && !dispensados.includes(sp.id)
  );

  useEffect(() => {
    const novos = prontos.filter((sp) => !idsJaAvisados.current.has(sp.id));
    if (novos.length > 0) {
      novos.forEach((sp) => idsJaAvisados.current.add(sp.id));
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([180, 90, 180]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prontos.map((sp) => sp.id).join(",")]);

  async function liberarItem(itemId: string, quantidade: number) {
    setLiberando((atual) => new Set(atual).add(itemId));
    try {
      await fetch(`/api/itens-sub-pedido/${itemId}/liberar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade }),
      });
      setQuantidadesEscolhidas((atual) => {
        const novo = { ...atual };
        delete novo[itemId];
        return novo;
      });
      await carregar();
    } finally {
      setLiberando((atual) => {
        const novo = new Set(atual);
        novo.delete(itemId);
        return novo;
      });
    }
  }

  function restanteDoItem(item: SubPedido["itens"][number]) {
    return item.quantidade - item.quantidadeLiberada;
  }

  function quantidadeEscolhida(item: SubPedido["itens"][number]) {
    return quantidadesEscolhidas[item.id] ?? restanteDoItem(item);
  }

  function ajustarQuantidadeEscolhida(item: SubPedido["itens"][number], delta: number) {
    setQuantidadesEscolhidas((atual) => {
      const restante = restanteDoItem(item);
      const valorAtual = atual[item.id] ?? restante;
      const novoValor = Math.min(restante, Math.max(1, valorAtual + delta));
      return { ...atual, [item.id]: novoValor };
    });
  }

  function fecharPager() {
    const novosDispensados = [...dispensados, ...prontos.map((sp) => sp.id)];
    setDispensados(novosDispensados);
    window.localStorage.setItem(chaveDispensados(pedidoId), JSON.stringify(novosDispensados));
    // avisa o quiosque que o cliente já está a caminho da retirada
    prontos.forEach((sp) => {
      fetch(`/api/sub-pedidos/${sp.id}/cliente-a-caminho`, { method: "POST" }).catch(() => {});
    });
  }

  const itensPager: ItemPager[] = prontos.map((sp) => ({
    id: sp.id,
    codigoRetirada: sp.codigoRetirada,
    quiosqueNome: sp.quiosque.nome,
    brincadeira: sp.quiosque.modalidade === "BRINCADEIRAS",
    mensagemPronto: sp.quiosque.mensagemPronto,
  }));

  return (
    <main className="tela">
      <PagerPronto itens={itensPager} onFechar={fecharPager} />

      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Acompanhar pedido
      </div>

      {erro && <div className="aviso">{erro}</div>}

      <div className="lista">
        {pedido && subPedidosAtivos.length === 0 && (
          <div className="cartao" style={{ textAlign: "center" }}>
            <p style={{ marginBottom: 0 }}>✅ Todos os seus pedidos já foram retirados. Bom apetite!</p>
          </div>
        )}

        {subPedidosAtivos.map((sp) => (
          <div key={sp.id} className="cartao">
            <b style={{ color: sp.quiosque.cor, fontFamily: "var(--font-sora)", fontSize: 15.5 }}>
              {sp.quiosque.nome}
            </b>

            <StatusPedidoStepper
              status={sp.status}
              modalidade={sp.quiosque.modalidade}
              cor={sp.quiosque.cor}
              vocEProximo={sp.vocEProximo}
              mensagemPreparando={sp.quiosque.mensagemPreparando}
              mensagemPronto={sp.quiosque.mensagemPronto}
              aguardandoLiberacao={sp.itens.every((item) => item.quantidadeLiberada === 0)}
            />

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {sp.itens.map((item) => {
                const restante = restanteDoItem(item);
                const escolha = quantidadeEscolhida(item);
                return (
                  <div key={item.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 13.5 }}>
                        {item.quantidade}× {item.nome}
                        {item.observacao && (
                          <span className="texto-fraco"> — {item.observacao}</span>
                        )}
                        {item.nomesCriancas.length > 0 && (
                          <span className="texto-fraco"> ({item.nomesCriancas.join(", ")})</span>
                        )}
                      </div>
                    </div>

                    {item.quantidadeLiberada > 0 && restante > 0 && (
                      <div className="texto-fraco" style={{ fontSize: 12, marginTop: 2 }}>
                        {item.quantidadeLiberada} de {item.quantidade} já mandados pra produção
                      </div>
                    )}

                    {restante > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        {restante > 1 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secundario"
                              style={{ padding: "4px 10px" }}
                              disabled={liberando.has(item.id) || escolha <= 1}
                              onClick={() => ajustarQuantidadeEscolhida(item, -1)}
                            >
                              −
                            </button>
                            <span className="mono">{escolha}</span>
                            <button
                              type="button"
                              className="btn btn-secundario"
                              style={{ padding: "4px 10px" }}
                              disabled={liberando.has(item.id) || escolha >= restante}
                              onClick={() => ajustarQuantidadeEscolhida(item, 1)}
                            >
                              +
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-secundario"
                          style={{ padding: "6px 10px", fontSize: 12.5, whiteSpace: "nowrap" }}
                          disabled={liberando.has(item.id)}
                          onClick={() => liberarItem(item.id, escolha)}
                        >
                          {liberando.has(item.id)
                            ? "Enviando…"
                            : escolha < item.quantidade
                            ? `Mandar ${escolha} pra produção`
                            : "Mandar pra produção"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {sp.itens.some((item) => restanteDoItem(item) > 0) && (
              <p className="texto-fraco" style={{ marginTop: 6, fontSize: 12 }}>
                Comprou em quantidade e ainda não quer tudo agora? Mande só uma parte pra produção —
                o resto continua com você até você mandar também.
              </p>
            )}

            <div style={{ marginTop: 12, textAlign: "center" }}>
              <div className="texto-fraco">Código de retirada</div>
              <div className="codigo-retirada">{sp.codigoRetirada}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="texto-fraco" style={{ marginTop: 10, textAlign: "center" }}>
        {carregando ? "Atualizando…" : "Atualizado automaticamente a cada poucos segundos."}
      </p>

      <Link href={`/e/${eventoId}`} className="btn btn-secundario btn-bloco" style={{ marginTop: 14 }}>
        ‹ Voltar à praça do evento
      </Link>
    </main>
  );
}
