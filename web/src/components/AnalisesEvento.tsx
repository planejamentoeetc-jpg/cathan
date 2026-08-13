import type { AnalyticsEvento } from "@/lib/analytics";
import { formatarMinutos } from "@/lib/analytics";
import { GraficoBarras } from "@/components/graficos/GraficoBarras";
import { GraficoColunas } from "@/components/graficos/GraficoColunas";
import { GraficoDonut } from "@/components/graficos/GraficoDonut";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AnalisesEvento({ dados }: { dados: AnalyticsEvento }) {
  return (
    <>
      <div className="g-grid">
        <div className="kpi">
          <div className="n">{dados.ticketMedio !== null ? formatarReais(dados.ticketMedio) : "—"}</div>
          <div className="l">Ticket médio por pedido</div>
        </div>
        <div className="kpi">
          <div className="n" style={{ color: "var(--verde)" }}>
            {dados.prazoPct !== null ? `${dados.prazoPct}%` : "—"}
          </div>
          <div className="l">Entregas no prazo</div>
        </div>
        <div className="kpi">
          <div className="n">
            {dados.tempoMedioProducaoMin !== null ? formatarMinutos(dados.tempoMedioProducaoMin) : "—"}
          </div>
          <div className="l">Tempo médio de produção</div>
        </div>
        <div className="kpi">
          <div className="n" style={{ fontSize: 16, lineHeight: 1.3 }}>
            {dados.produtoCampeao ? `${dados.produtoCampeao.nome} · ${dados.produtoCampeao.quantidade} un.` : "—"}
          </div>
          <div className="l">Produto mais vendido</div>
        </div>
      </div>

      <div className="g-grid-graficos">
        <div className="g-sec" style={{ margin: 0 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>💳 Formas de pagamento</h5>
          <GraficoDonut
            segmentos={[
              { label: "Mercado Pago", valor: dados.vendasPorForma.mercadoPago, cor: "#1E8E5A", texto: formatarReais(dados.vendasPorForma.mercadoPago) },
              { label: "Dinheiro (caixa)", valor: dados.vendasPorForma.dinheiro, cor: "#FFB94A", texto: formatarReais(dados.vendasPorForma.dinheiro) },
            ]}
          />
        </div>

        <div className="g-sec" style={{ margin: 0 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>🔄 Funil — Alimentação/Bebidas</h5>
          <GraficoColunas dados={dados.funilAlimentacao} />
        </div>

        {dados.temBrincadeiras && (
          <div className="g-sec" style={{ margin: 0 }}>
            <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>🎯 Funil — Brincadeiras</h5>
            <GraficoColunas dados={dados.funilBrincadeiras} />
          </div>
        )}

        <div className="g-sec" style={{ margin: 0 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>💰 Faturamento por quiosque</h5>
          <GraficoBarras dados={dados.vendasPorQuiosque} formatar={formatarReais} />
        </div>

        <div className="g-sec" style={{ margin: 0 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>🏆 Top produtos por quantidade</h5>
          <GraficoBarras dados={dados.topProdutos} />
        </div>

        {dados.tempoPorQuiosque.length > 0 && (
          <div className="g-sec" style={{ margin: 0 }}>
            <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
              ⏱ Tempo médio real × prazo por quiosque
            </h5>
            <GraficoBarras dados={dados.tempoPorQuiosque} />
          </div>
        )}
      </div>

      <div className="g-sec">
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
          ⏱ Monitor de produção — tempo real vs tempo cadastrado
        </h5>
        {dados.slaLinhas.length === 0 ? (
          <p className="texto-fraco">Nenhum pedido entrou em produção ainda.</p>
        ) : (
          dados.slaLinhas.map((linha, idx) => (
            <div key={idx} className="g-row">
              <span
                className="mono"
                style={{ background: "var(--petroleo)", color: "#fff", padding: "2px 9px", borderRadius: 7, fontSize: 12.5 }}
              >
                {linha.codigoRetirada}
              </span>
              <span>
                {linha.quiosqueNome} · {linha.clienteNome}
              </span>
              <span
                className="val"
                style={{ fontSize: 12.5, color: linha.noPrazo ? "var(--verde)" : "#D93025" }}
              >
                {!linha.finalizado ? "⏳ " : ""}
                {formatarMinutos(linha.decorridoMin)} / prazo {linha.prazoMin} min ·{" "}
                {linha.noPrazo ? "✓ no prazo" : "⚠ prazo estourado"}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
