"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { STATUS_LABEL } from "@/lib/statusSubPedido";
import { ItemPager, PagerPronto } from "@/components/PagerPronto";

type SubPedido = {
  id: string;
  status: keyof typeof STATUS_LABEL;
  codigoRetirada: string;
  quiosque: { id: string; nome: string; cor: string; modalidade: string };
  vocEProximo: boolean;
  itens: {
    nome: string;
    quantidade: number;
    precoUnitario: number;
    observacao: string | null;
    nomesCriancas: string[];
  }[];
};

type Pedido = {
  id: string;
  criadoEm: string;
  subPedidos: SubPedido[];
};

const INTERVALO_POLLING_MS = 3000;

function classeBadge(status: string) {
  if (status === "RECEBIDO") return "badge-status recebido";
  if (status === "PRONTO" || status === "CHAMADO") return "badge-status pronto";
  if (status === "RETIRADO" || status === "CANCELADO" || status === "CONCLUIDO") {
    return "badge-status retirado";
  }
  return "badge-status";
}

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
  const idsJaAvisados = useRef<Set<string>>(new Set());

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/pedidos/${pedidoId}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Pedido não encontrado.");
      setPedido(await resposta.json());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar pedido.");
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

  const prontos = (pedido?.subPedidos ?? []).filter(
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

  function fecharPager() {
    const novosDispensados = [...dispensados, ...prontos.map((sp) => sp.id)];
    setDispensados(novosDispensados);
    window.localStorage.setItem(chaveDispensados(pedidoId), JSON.stringify(novosDispensados));
  }

  const itensPager: ItemPager[] = prontos.map((sp) => ({
    id: sp.id,
    codigoRetirada: sp.codigoRetirada,
    quiosqueNome: sp.quiosque.nome,
    brincadeira: sp.quiosque.modalidade === "BRINCADEIRAS",
  }));

  return (
    <main className="tela">
      <PagerPronto itens={itensPager} onFechar={fecharPager} />

      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Acompanhar pedido
      </div>

      {erro && <div className="aviso">{erro}</div>}

      <div className="lista">
        {pedido?.subPedidos.map((sp) => (
          <div key={sp.id} className="cartao">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ color: sp.quiosque.cor, fontFamily: "var(--font-sora)" }}>
                {sp.quiosque.nome}
              </b>
              <span className={sp.vocEProximo ? "badge-status proximo" : classeBadge(sp.status)}>
                {sp.vocEProximo
                  ? sp.quiosque.modalidade === "BRINCADEIRAS"
                    ? "Você é o próximo!"
                    : "Já vamos preparar o seu!"
                  : STATUS_LABEL[sp.status]}
              </span>
            </div>

            <div style={{ marginTop: 10 }}>
              {sp.itens.map((item, idx) => (
                <div key={idx} style={{ fontSize: 13.5 }}>
                  {item.quantidade}× {item.nome}
                  {item.observacao && (
                    <span className="texto-fraco"> — {item.observacao}</span>
                  )}
                  {item.nomesCriancas.length > 0 && (
                    <span className="texto-fraco"> ({item.nomesCriancas.join(", ")})</span>
                  )}
                </div>
              ))}
            </div>

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

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link href={`/e/${eventoId}`} className="texto-fraco">
          ‹ Voltar à praça do evento
        </Link>
      </div>
    </main>
  );
}
