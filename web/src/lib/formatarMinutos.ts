// Sem dependência nenhuma de propósito (nem de lib/analytics.ts, que importa
// prisma) -- precisa poder ser importado por componentes client-side
// (AnalisesEvento.tsx) sem arrastar o PrismaClient pro bundle do navegador.
export function formatarMinutos(min: number): string {
  if (min < 1) return `${Math.round(min * 60)} s`;
  return `${min.toFixed(1)} min`;
}
