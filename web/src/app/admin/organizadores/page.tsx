import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizadoresAdmin() {
  const organizadores = await prisma.organizador.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { eventos: true } } },
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
        <span>Organizadores</span>
        <Link href="/admin" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Console Cathan
        </Link>
      </div>

      <p className="texto-fraco" style={{ marginBottom: 16 }}>
        Todo cliente que usa a Cathan, com a % de comissão e o status da conexão Mercado Pago.
      </p>

      <div className="lista">
        {organizadores.map((organizador) => (
          <Link
            key={organizador.id}
            href={`/admin/organizadores/${organizador.id}`}
            className="cartao quiosque-card"
          >
            <div style={{ flex: 1 }}>
              <b style={{ fontFamily: "var(--font-sora)", fontSize: 15.5, display: "block" }}>
                {organizador.nome}
              </b>
              <span className="texto-fraco">
                {organizador.email} — {organizador._count.eventos}{" "}
                {organizador._count.eventos === 1 ? "evento" : "eventos"} —{" "}
                {organizador.mpUserId ? "MP conectado" : "MP não conectado"}
              </span>
            </div>
            <div className="seta">›</div>
          </Link>
        ))}

        {organizadores.length === 0 && <p className="texto-fraco">Nenhum organizador cadastrado ainda.</p>}
      </div>
    </main>
  );
}
