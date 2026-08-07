"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type StatusResposta = {
  status: "PENDENTE" | "CONFIRMADO" | "EXPIRADO";
  pedidoId: string | null;
};

const MAX_TENTATIVAS = 12;
const INTERVALO_MS = 2000;

// Para onde o Mercado Pago manda o comprador de volta (success/pending/failure
// apontam todos pra cá — ver back_urls em POST /api/pedidos). O Pedido real só
// existe depois que o webhook confirma o pagamento, então esta tela faz
// polling até isso acontecer.
export default function RetornoCheckout() {
  return (
    <Suspense fallback={null}>
      <RetornoCheckoutConteudo />
    </Suspense>
  );
}

function RetornoCheckoutConteudo() {
  const router = useRouter();
  const { eventoId } = useParams<{ eventoId: string }>();
  const searchParams = useSearchParams();
  const pedidoPendenteId = searchParams.get("pedidoPendenteId");
  const statusMp = searchParams.get("status") ?? searchParams.get("collection_status");

  const [esgotado, setEsgotado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const verificar = useCallback(async () => {
    if (!pedidoPendenteId) return;
    try {
      const resposta = await fetch(`/api/pedidos-pendentes/${pedidoPendenteId}`, { cache: "no-store" });
      if (!resposta.ok) {
        setErro("Não encontramos esse checkout.");
        return;
      }
      const dados: StatusResposta = await resposta.json();
      if (dados.status === "CONFIRMADO" && dados.pedidoId) {
        router.push(`/e/${eventoId}/pedido/${dados.pedidoId}`);
      }
    } catch {
      // silencioso — tenta de novo no próximo ciclo
    }
  }, [pedidoPendenteId, eventoId, router]);

  useEffect(() => {
    if (!pedidoPendenteId) {
      setErro("Checkout inválido.");
      return;
    }

    verificar();
    let tentativas = 0;
    const intervalo = setInterval(() => {
      tentativas += 1;
      if (tentativas >= MAX_TENTATIVAS) {
        clearInterval(intervalo);
        setEsgotado(true);
        return;
      }
      verificar();
    }, INTERVALO_MS);

    return () => clearInterval(intervalo);
  }, [pedidoPendenteId, verificar]);

  const pagamentoRecusado = statusMp === "rejected" || statusMp === "failure";

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Pagamento
      </div>

      <div className="cartao" style={{ textAlign: "center" }}>
        {erro && <p className="aviso">{erro}</p>}

        {!erro && pagamentoRecusado && (
          <>
            <p style={{ marginBottom: 12 }}>Seu pagamento não foi aprovado.</p>
            <Link href={`/e/${eventoId}/carrinho`} className="btn btn-primario btn-bloco">
              Voltar ao carrinho
            </Link>
          </>
        )}

        {!erro && !pagamentoRecusado && !esgotado && (
          <p className="texto-fraco">Confirmando seu pagamento…</p>
        )}

        {!erro && !pagamentoRecusado && esgotado && (
          <>
            <p style={{ marginBottom: 12 }}>
              Seu pagamento ainda está sendo processado (comum em pagamentos via PIX). Você pode
              fechar esta tela — assim que for confirmado, seu pedido aparece pronto para
              acompanhamento.
            </p>
            <button
              type="button"
              className="btn btn-secundario btn-bloco"
              onClick={() => verificar()}
            >
              Verificar novamente
            </button>
          </>
        )}
      </div>
    </main>
  );
}
