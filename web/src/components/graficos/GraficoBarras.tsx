import type { SegmentoGrafico } from "@/lib/analytics";

export function GraficoBarras({
  dados,
  formatar,
}: {
  dados: SegmentoGrafico[];
  formatar?: (valor: number) => string;
}) {
  if (dados.length === 0) {
    return <p className="texto-fraco">Sem dados ainda.</p>;
  }

  const max = Math.max(...dados.map((d) => d.valor), 0.0001);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {dados.map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span style={{ flex: "0 0 110px", color: "var(--cinza)" }}>{d.label}</span>
          <span
            style={{
              flex: 1,
              height: 10,
              borderRadius: 999,
              background: "var(--linha)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${Math.max(2, (d.valor / max) * 100).toFixed(1)}%`,
                background: d.cor,
                borderRadius: 999,
              }}
            />
          </span>
          <span style={{ flex: "0 0 auto", fontWeight: 800, fontFamily: "var(--font-sora)" }}>
            {d.texto ?? (formatar ? formatar(d.valor) : d.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}
