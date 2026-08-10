import type { SegmentoGrafico } from "@/lib/analytics";

export function GraficoColunas({ dados }: { dados: SegmentoGrafico[] }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 130 }}>
      {dados.map((d) => (
        <div key={d.label} style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
          <b style={{ color: d.cor, fontSize: 13 }}>{d.valor}</b>
          <span
            style={{
              display: "block",
              width: "100%",
              maxWidth: 32,
              height: Math.max(8, (d.valor / max) * 78),
              background: d.cor,
              borderRadius: "6px 6px 0 0",
              marginTop: 4,
            }}
          />
          <span className="texto-fraco" style={{ fontSize: 10.5, marginTop: 6, lineHeight: 1.2 }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
