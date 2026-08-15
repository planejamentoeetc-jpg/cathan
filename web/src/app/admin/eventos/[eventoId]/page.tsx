import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularAnalyticsEvento } from "@/lib/analytics";
import { PainelComOlho } from "@/components/PainelComOlho";
import { ChatSuporte } from "@/components/ChatSuporte";
import { AutoRefresh } from "@/components/AutoRefresh";
import { FormularioComissaoEvento } from "@/components/FormularioComissaoEvento";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EventoAdmin({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: { organizador: { select: { id: true, nome: true } } },
  });
  if (!evento) notFound();

  const dados = await calcularAnalyticsEvento(evento.id);
  const taxaCathan = Number(evento.comissaoPercentual) / 100;
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

      <PainelComOlho
        dados={dados}
        kpis={[
          { valor: formatarReais(dados.vendasTotal), rotulo: "Movimentado no evento (GMV)" },
          {
            valor: formatarReais(comissao),
            rotulo: `Faturamento Cathan · taxa ${(taxaCathan * 100).toFixed(1)}%`,
            cor: "var(--verde)",
          },
          { valor: formatarReais(repasse), rotulo: "Repasse aos lojistas" },
          { valor: "● Operacional", rotulo: "Status do sistema", cor: "var(--verde)", oculta: false },
        ]}
      />

      {evento.organizador && (
        <div className="g-sec">
          <div className="g-row">
            Organizador
            <span className="val">{evento.organizador.nome}</span>
          </div>
          <Link
            href={`/admin/organizadores/${evento.organizador.id}`}
            style={{ fontSize: 12.5, color: "var(--verde)", display: "block", marginTop: 4 }}
          >
            Ver organizador
          </Link>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--linha)" }}>
            <FormularioComissaoEvento
              eventoId={evento.id}
              comissaoInicial={Number(evento.comissaoPercentual)}
            />
          </div>
        </div>
      )}

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
