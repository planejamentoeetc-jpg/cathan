import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BotaoSair } from "@/components/BotaoSair";

export default async function EscolherQuiosque({
  params,
}: {
  params: { eventoId: string };
}) {
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
        <span>{evento.nome} — qual quiosque você opera?</span>
        <BotaoSair eventoId={evento.id} />
      </div>

      <div className="lista">
        {evento.quiosques.map((quiosque) => (
          <Link
            key={quiosque.id}
            href={`/painel/${evento.id}/q/${quiosque.id}`}
            className="cartao quiosque-card"
          >
            <div className="quiosque-logo" style={{ background: quiosque.cor }}>
              <IconeModalidade modalidade={quiosque.modalidade} />
            </div>
            <b>{quiosque.nome}</b>
            <div className="seta">›</div>
          </Link>
        ))}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}
      </div>
    </main>
  );
}
