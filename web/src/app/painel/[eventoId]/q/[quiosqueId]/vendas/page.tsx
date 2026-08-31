import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularAnalyticsQuiosque } from "@/lib/analyticsQuiosque";
import { PainelAnalisesQuiosque } from "@/components/PainelAnalisesQuiosque";
import { AutoRefresh } from "@/components/AutoRefresh";
import { exigirSessaoQuiosque } from "@/lib/exigirSessaoQuiosque";

export const dynamic = "force-dynamic";

export default async function VendasQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });
  if (!quiosque) notFound();
  await exigirSessaoQuiosque(quiosque, `/painel/${params.eventoId}/q/${params.quiosqueId}/vendas`);

  const dados = await calcularAnalyticsQuiosque(quiosque.id);

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
        <span>Minhas vendas</span>
        <Link href={`/painel/${params.eventoId}/q/${quiosque.id}`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          ‹ {quiosque.nome}
        </Link>
      </div>

      <PainelAnalisesQuiosque dados={dados} />
    </main>
  );
}
