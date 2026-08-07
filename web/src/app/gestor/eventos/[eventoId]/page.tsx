import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IconeModalidade } from "@/components/IconeModalidade";

const NOME_MODALIDADE: Record<string, string> = {
  ALIMENTACAO: "Alimentação",
  BEBIDAS: "Bebidas",
  BRINCADEIRAS: "Brincadeiras",
};

function formatarData(data: Date) {
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function EventoGestor({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: { quiosques: { orderBy: { nome: "asc" } } },
  });

  if (!evento) notFound();

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
        <Link href="/gestor" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Meus eventos
        </Link>
      </div>

      <div className="cartao" style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 6 }}>
          <b>Local:</b> {evento.local}
        </p>
        <p style={{ marginBottom: 6 }}>
          <b>Data:</b> {formatarData(evento.data)}
        </p>
        <p>
          <b>Geofencing:</b>{" "}
          {evento.raioPedidosMetros !== null
            ? `raio de ${evento.raioPedidosMetros}m`
            : "não aplicável"}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b style={{ fontFamily: "var(--font-sora)" }}>Quiosques</b>
        <Link href={`/gestor/eventos/${evento.id}/quiosques/novo`} className="btn btn-primario">
          + Quiosque
        </Link>
      </div>

      <div className="lista">
        {evento.quiosques.map((quiosque) => (
          <div key={quiosque.id} className="cartao quiosque-card">
            <div className="quiosque-logo" style={{ background: quiosque.cor }}>
              <IconeModalidade modalidade={quiosque.modalidade} />
            </div>
            <div>
              <b>{quiosque.nome}</b>
              <div className="texto-fraco">{NOME_MODALIDADE[quiosque.modalidade]}</div>
            </div>
          </div>
        ))}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}
      </div>
    </main>
  );
}
