import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Índice de conveniência para testes locais (o cliente real chega via QR Code de /e/[eventoId]).
export default async function Home() {
  const eventos = await prisma.evento.findMany({ orderBy: { criadoEm: "desc" } });

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Cathan — Eventos (dev)
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
            Nenhum evento cadastrado. Rode <code className="mono">npm run prisma:seed</code>.
          </p>
        )}
      </div>
    </main>
  );
}
