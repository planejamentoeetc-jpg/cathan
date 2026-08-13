import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BotaoSairAdmin } from "@/components/BotaoSairAdmin";

// mesmo motivo do /gestor: sem isso, o Next prerenderia esta lista estática no
// build e congelaria a foto do último deploy, ignorando eventos criados/excluídos depois.
export const dynamic = "force-dynamic";

function formatarData(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function ConsoleCathan() {
  const eventos = await prisma.evento.findMany({
    orderBy: { data: "desc" },
    include: { _count: { select: { quiosques: true, pedidos: true } } },
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
        <span>Console Cathan</span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/admin/organizadores" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
            Organizadores
          </Link>
          <BotaoSairAdmin />
        </div>
      </div>

      <p className="texto-fraco" style={{ marginBottom: 16 }}>
        Visão da equipe Cathan sobre todos os eventos da plataforma.
      </p>

      <div className="lista">
        {eventos.map((evento) => (
          <Link key={evento.id} href={`/admin/eventos/${evento.id}`} className="cartao quiosque-card">
            <div style={{ flex: 1 }}>
              <b style={{ fontFamily: "var(--font-sora)", fontSize: 15.5, display: "block" }}>
                {evento.nome}
              </b>
              <span className="texto-fraco">
                {formatarData(evento.data)} — {evento.local} — {evento._count.quiosques}{" "}
                {evento._count.quiosques === 1 ? "quiosque" : "quiosques"} —{" "}
                {evento._count.pedidos} {evento._count.pedidos === 1 ? "pedido" : "pedidos"}
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
