import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";
import { calcularEsperaEstimadaMinutos, formatarEspera } from "@/lib/esperaEstimada";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";

export default async function PracaDoEvento({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: {
      quiosques: {
        orderBy: { nome: "asc" },
        include: {
          produtos: {
            where: { ativo: true },
            select: { tempoProducaoMinutos: true },
          },
          // fatias ainda na fila de produção (não retiradas/canceladas)
          subPedidos: {
            where: { status: { in: STATUS_ATIVOS } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!evento) notFound();

  return (
    <main className="tela">
      <div className="hero">
        <div className="nome">{evento.nome}</div>
        <div className="sub">{evento.local}</div>
      </div>

      <div className="lista">
        {evento.quiosques.map((quiosque) => {
          const esperaMinutos = calcularEsperaEstimadaMinutos(
            quiosque.produtos.map((p) => p.tempoProducaoMinutos),
            quiosque.subPedidos.length
          );

          return (
            <Link
              key={quiosque.id}
              href={`/e/${evento.id}/q/${quiosque.id}`}
              className="cartao quiosque-card"
            >
              <div className="quiosque-logo" style={{ background: quiosque.cor }}>
                <IconeModalidade modalidade={quiosque.modalidade} />
              </div>
              <div>
                <b>{quiosque.nome}</b>
                <div className="espera">{formatarEspera(esperaMinutos)}</div>
              </div>
              <div className="seta">›</div>
            </Link>
          );
        })}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}
      </div>

      <BarraCarrinho eventoId={evento.id} />
    </main>
  );
}
