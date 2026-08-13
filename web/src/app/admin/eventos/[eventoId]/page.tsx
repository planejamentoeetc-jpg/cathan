import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularAnalyticsEvento } from "@/lib/analytics";
import { AnalisesEvento } from "@/components/AnalisesEvento";
import { ChatSuporte } from "@/components/ChatSuporte";
import { AutoRefresh } from "@/components/AutoRefresh";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EventoAdmin({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: { organizador: { select: { id: true, nome: true, comissaoPercentual: true } } },
  });
  if (!evento) notFound();

  const dados = await calcularAnalyticsEvento(evento.id);
  const taxaCathan = Number(evento.organizador?.comissaoPercentual ?? 4.9) / 100;
  const comissao = dados.vendasTotal * taxaCathan;
  const repasse = dados.vendasTotal - comissao;

  return (
    <main className="tela tela-larga">
      <AutoRefresh />
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
          <div className="l">Faturamento Cathan · taxa {(taxaCathan * 100).toFixed(1)}%</div>
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

      {evento.organizador && (
        <div className="g-sec">
          <div className="g-row">
            Organizador
            <span className="val">{evento.organizador.nome}</span>
          </div>
          <div className="g-row">
            Comissão configurada
            <span className="val">{Number(evento.organizador.comissaoPercentual).toFixed(1)}%</span>
          </div>
          <Link
            href={`/admin/organizadores/${evento.organizador.id}`}
            className="btn btn-secundario btn-bloco"
            style={{ marginTop: 10 }}
          >
            Ajustar comissão deste organizador
          </Link>
        </div>
      )}

      <AnalisesEvento dados={dados} />

      <div className="g-sec">
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
          🎧 Suporte — chamados do gestor
        </h5>
        <ChatSuporte
          apiUrl={`/api/admin/eventos/${evento.id}/suporte`}
          remetente="CATHAN"
          placeholder="Responder ao gestor…"
          rotuloEnviar="Enviar resposta"
        />
      </div>
    </main>
  );
}
