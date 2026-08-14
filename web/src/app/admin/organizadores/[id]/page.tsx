import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatarData(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function OrganizadorAdmin({ params }: { params: { id: string } }) {
  const organizador = await prisma.organizador.findUnique({
    where: { id: params.id },
    include: { eventos: { orderBy: { data: "desc" } } },
  });
  if (!organizador) notFound();

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
        <span>{organizador.nome}</span>
        <Link href="/admin/organizadores" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Organizadores
        </Link>
      </div>

      <div className="cartao" style={{ marginBottom: 16 }}>
        <div className="g-row">
          E-mail
          <span className="val">{organizador.email}</span>
        </div>
        <div className="g-row">
          Conexão Mercado Pago
          <span className="val" style={{ color: organizador.mpUserId ? "var(--verde)" : "var(--festa)" }}>
            {organizador.mpUserId ? "✓ conectado" : "não conectado"}
          </span>
        </div>
      </div>

      <p className="texto-fraco" style={{ marginBottom: 16 }}>
        A % de comissão é configurada por evento — abra o evento abaixo pra ajustar.
      </p>

      <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 10 }}>
        Eventos ({organizador.eventos.length})
      </b>
      <div className="lista">
        {organizador.eventos.map((evento) => (
          <Link key={evento.id} href={`/admin/eventos/${evento.id}`} className="cartao quiosque-card">
            <div style={{ flex: 1 }}>
              <b style={{ fontFamily: "var(--font-sora)", fontSize: 14.5, display: "block" }}>
                {evento.nome}
              </b>
              <span className="texto-fraco">
                {formatarData(evento.data)} — {evento.local}
              </span>
            </div>
            <div className="seta">›</div>
          </Link>
        ))}

        {organizador.eventos.length === 0 && (
          <p className="texto-fraco">Nenhum evento cadastrado ainda.</p>
        )}
      </div>
    </main>
  );
}
