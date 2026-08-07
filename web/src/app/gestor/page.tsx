import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BotaoSairGestor } from "@/components/BotaoSairGestor";

function formatarData(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function PainelGestor() {
  const eventos = await prisma.evento.findMany({
    orderBy: { data: "desc" },
    include: { _count: { select: { quiosques: true } } },
  });

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
        <span>Meus eventos</span>
        <BotaoSairGestor />
      </div>

      <Link href="/gestor/eventos/novo" className="btn btn-primario btn-bloco" style={{ marginBottom: 16 }}>
        + Criar evento
      </Link>

      <div className="lista">
        {eventos.map((evento) => (
          <Link key={evento.id} href={`/gestor/eventos/${evento.id}`} className="cartao quiosque-card">
            <div style={{ flex: 1 }}>
              <b style={{ fontFamily: "var(--font-sora)", fontSize: 15.5, display: "block" }}>
                {evento.nome}
              </b>
              <span className="texto-fraco">
                {formatarData(evento.data)} — {evento.local} — {evento._count.quiosques}{" "}
                {evento._count.quiosques === 1 ? "quiosque" : "quiosques"}
              </span>
            </div>
            <div className="seta">›</div>
          </Link>
        ))}

        {eventos.length === 0 && <p className="texto-fraco">Nenhum evento cadastrado ainda.</p>}
      </div>
    </main>
  );
}
