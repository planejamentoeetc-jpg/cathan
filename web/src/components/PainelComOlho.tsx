"use client";

import { useState, type ReactNode } from "react";
import type { AnalyticsEvento } from "@/lib/analytics";
import { AnalisesEvento } from "@/components/AnalisesEvento";

export type KpiOcultavel = {
  valor: string;
  rotulo: string;
  cor?: string;
  // false pros KPIs que não são dinheiro (ex.: contagem de pedidos, status) --
  // esses continuam visíveis mesmo com o olho fechado
  oculta?: boolean;
};

const OCULTO = "••••";

// Dono do estado "mostrar valores em dinheiro" da tela -- passado tanto pros
// próprios KPIs quanto pro <AnalisesEvento> logo abaixo, então os dois
// compartilham a mesma visibilidade com um único botão de olho.
//
// AnalisesEvento é renderizado AQUI DENTRO (não recebido de fora via prop
// função) de propósito: a página que usa isto é um Server Component, e
// Server Components não podem passar funções como children pra um Client
// Component (só dá pra passar dados serializáveis, JSX já pronto, ou nada) --
// só assim o estado do olho consegue chegar até dentro do AnalisesEvento.
export function PainelComOlho({
  kpis,
  dados,
  children,
}: {
  kpis: KpiOcultavel[];
  dados: AnalyticsEvento;
  children?: ReactNode;
}) {
  const [mostrarValores, setMostrarValores] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          type="button"
          className="btn btn-secundario"
          style={{ padding: "8px 12px", fontSize: 12.5 }}
          onClick={() => setMostrarValores((atual) => !atual)}
          title={mostrarValores ? "Ocultar valores em dinheiro" : "Mostrar valores em dinheiro"}
        >
          {mostrarValores ? "🙈 Ocultar valores" : "👁 Mostrar valores"}
        </button>
      </div>

      <div className="g-grid">
        {kpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="n" style={kpi.cor ? { color: kpi.cor } : undefined}>
              {kpi.oculta === false || mostrarValores ? kpi.valor : OCULTO}
            </div>
            <div className="l">{kpi.rotulo}</div>
          </div>
        ))}
      </div>

      {children}

      <AnalisesEvento dados={dados} mostrarValores={mostrarValores} />
    </>
  );
}
