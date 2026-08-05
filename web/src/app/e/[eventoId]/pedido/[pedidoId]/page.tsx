"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { STATUS_LABEL } from "@/lib/statusSubPedido";

type SubPedido = {
  id: string;
  status: keyof typeof STATUS_LABEL;
  codigoRetirada: string;
  quiosque: { id: string; nome: string; cor: string; modalidade: string };
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

function classeBadge(status: string) {
  if (status === "RECEBIDO") return "badge-status recebido";
  if (status === "PRONTO" || status === "CHAMADO") return "badge-status pronto";
  if (status === "RETIRADO" || status === "CANCELADO" || status === "CONCLUIDO") {
    return "badge-status retirado";
  }
  return "badge-status";
}

export default function Acompanhamento() {
  const { eventoId, pedidoId } = useParams<{ eventoId: string; pedidoId: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
    carregar();
  }, [carregar]);

  return (
    <main className="tela">
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
              <span className={classeBadge(sp.status)}>{STATUS_LABEL[sp.status]}</span>
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

      <button
        type="button"
        className="btn btn-secundario btn-bloco"
        style={{ marginTop: 16 }}
        onClick={carregar}
        disabled={carregando}
      >
        {carregando ? "Atualizando…" : "Atualizar status"}
      </button>

      <p className="texto-fraco" style={{ marginTop: 10, textAlign: "center" }}>
        Atualização automática chega na próxima fase — por enquanto, use o botão acima.
      </p>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link href={`/e/${eventoId}`} className="texto-fraco">
          ‹ Voltar à praça do evento
        </Link>
      </div>
    </main>
  );
}
