import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularAnalyticsEvento, TAXA_CATHAN } from "@/lib/analytics";
import { AnalisesEvento } from "@/components/AnalisesEvento";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EventoAdmin({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) notFound();

  const dados = await calcularAnalyticsEvento(evento.id);
  const comissao = dados.vendasTotal * TAXA_CATHAN;
  const repasse = dados.vendasTotal - comissao;

  return (
    <main className="tela">
      <div
        className="topo"
        style={{
          borderRadius: 18,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{evento.nome}</span>
        <Link href="/admin" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Console Cathan
        </Link>
      </div>

      <div className="g-grid">
        <div className="kpi">
          <div className="n">{formatarReais(dados.vendasTotal)}</div>
          <div className="l">Movimentado no evento (GMV)</div>
        </div>
        <div className="kpi">
          <div className="n" style={{ color: "var(--verde)" }}>
            {formatarReais(comissao)}
          </div>
          <div className="l">Faturamento Cathan · taxa {(TAXA_CATHAN * 100).toFixed(1)}%</div>
        </div>
        <div className="kpi">
          <div className="n">{formatarReais(repasse)}</div>
          <div className="l">Repasse aos lojistas</div>
        </div>
        <div className="kpi">
          <div className="n" style={{ color: "var(--verde)" }}>
            ● Operacional
          </div>
          <div className="l">Status do sistema</div>
        </div>
      </div>

      <AnalisesEvento dados={dados} />
    </main>
  );
}
