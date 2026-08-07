import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioProduto } from "@/components/FormularioProduto";

export default async function NovoProduto({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });

  if (!quiosque) notFound();

  const rotuloTempo =
    quiosque.modalidade === "BRINCADEIRAS"
      ? "Duração da atividade (min)"
      : "Tempo de produção (min)";

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
        <span>Novo produto</span>
        <Link
          href={`/painel/${params.eventoId}/q/${params.quiosqueId}/produtos`}
          style={{ fontSize: 12.5, color: "#BFD4DA" }}
        >
          Cancelar
        </Link>
      </div>

      <FormularioProduto
        eventoId={params.eventoId}
        quiosqueId={params.quiosqueId}
        rotuloTempo={rotuloTempo}
      />
    </main>
  );
}
