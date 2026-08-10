import type { SegmentoGrafico } from "@/lib/analytics";

export function GraficoDonut({ segmentos }: { segmentos: SegmentoGrafico[] }) {
  const total = segmentos.reduce((s, seg) => s + seg.valor, 0);

  if (total === 0) {
    return <p className="texto-fraco">Sem dados ainda.</p>;
  }

  const circunferencia = 2 * Math.PI * 40;
  let acumulado = 0;
  const arcos = segmentos
    .filter((seg) => seg.valor > 0)
    .map((seg) => {
      const fracao = seg.valor / total;
      const dash = `${(fracao * circunferencia).toFixed(1)} ${(circunferencia - fracao * circunferencia).toFixed(1)}`;
      const rotacao = (acumulado / total) * 360 - 90;
      acumulado += seg.valor;
      return (
        <circle
          key={seg.label}
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke={seg.cor}
          strokeWidth="22"
          strokeDasharray={dash}
          transform={`rotate(${rotacao} 60 60)`}
        />
      );
    });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg viewBox="0 0 120 120" style={{ width: 132, height: 132, flex: "0 0 auto" }}>
        {arcos}
      </svg>
      <div>
        {segmentos.map((seg) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.cor, display: "inline-block" }} />
            {seg.label}: <b>{seg.texto ?? seg.valor}</b> · {Math.round((seg.valor / total) * 100)}%
          </div>
        ))}
      </div>
    </div>
  );
}
