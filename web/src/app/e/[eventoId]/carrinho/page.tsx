"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { agruparPorQuiosque, atualizarQuantidade, calcularTotal, useCarrinho } from "@/lib/cart";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Carrinho() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const router = useRouter();
  const itens = useCarrinho(eventoId);
  const grupos = agruparPorQuiosque(itens);

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 10 }}>
        Carrinho
      </div>

      <Link href={`/e/${eventoId}`} className="btn btn-secundario btn-bloco" style={{ marginBottom: 16 }}>
        ‹ Continuar comprando
      </Link>

      {itens.length === 0 && (
        <div className="cartao">
          <p className="texto-fraco">Seu carrinho está vazio.</p>
          <Link href={`/e/${eventoId}`} className="btn btn-secundario" style={{ marginTop: 12 }}>
            Ver quiosques
          </Link>
        </div>
      )}

      <div className="lista">
        {grupos.map((grupo) => (
          <div key={grupo[0].quiosqueId} className="cartao">
            <b style={{ color: grupo[0].quiosqueCor, fontFamily: "var(--font-sora)" }}>
              {grupo[0].quiosqueNome}
            </b>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {grupo.map((item) => (
                <div
                  key={item.produtoId}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.nome}</div>
                    {item.observacao && (
                      <div className="texto-fraco">Obs: {item.observacao}</div>
                    )}
                    <div className="texto-fraco">{formatarReais(item.preco)} cada</div>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      onClick={() =>
                        atualizarQuantidade(eventoId, item.produtoId, item.quantidade - 1)
                      }
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span>{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() =>
                        atualizarQuantidade(eventoId, item.produtoId, item.quantidade + 1)
                      }
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {itens.length > 0 && (
        <div className="barra-inferior" style={{ flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontWeight: 800,
            }}
          >
            <span>Total</span>
            <span>{formatarReais(calcularTotal(itens))}</span>
          </div>
          <button
            type="button"
            className="btn btn-primario btn-bloco"
            onClick={() => router.push(`/e/${eventoId}/checkout`)}
          >
            Ir para o checkout
          </button>
        </div>
      )}
    </main>
  );
}
