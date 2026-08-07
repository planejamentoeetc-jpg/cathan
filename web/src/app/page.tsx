import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Índice de conveniência (o cliente real chega via QR Code de /e/[eventoId]; o
// gestor usa isso pra achar o link do evento logo depois de criá-lo).
export default async function Home() {
  const eventos = await prisma.evento.findMany({ orderBy: { criadoEm: "desc" } });

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Cathan — Eventos
      </div>

      <div className="lista">
        {eventos.map((evento) => (
          <Link key={evento.id} href={`/e/${evento.id}`} className="cartao">
            <b style={{ fontFamily: "var(--font-sora)" }}>{evento.nome}</b>
            <div className="texto-fraco">{evento.local}</div>
            <div className="texto-fraco">
              Raio: {evento.raioPedidosMetros ? `${evento.raioPedidosMetros} m` : "não aplicável"}
            </div>
          </Link>
        ))}

        {eventos.length === 0 && (
          <p className="texto-fraco">
            Nenhum evento cadastrado ainda. Crie um pelo{" "}
            <Link href="/gestor">painel do gestor</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
