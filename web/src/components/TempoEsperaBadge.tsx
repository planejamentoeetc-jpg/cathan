export function TempoEsperaBadge({ minutos }: { minutos: number | null }) {
  if (!minutos) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        padding: "5px 12px",
        borderRadius: 999,
        background: "var(--verde-suave)",
        color: "var(--verde)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      ⏱ Tempo de espera agora: ~{minutos} min
    </div>
  );
}
