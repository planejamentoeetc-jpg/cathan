import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { CriarQuiosqueForm } from "@/components/CriarQuiosqueForm";

export default async function NovoQuiosque({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
  });
  if (!evento) notFound();

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        {evento.nome} — novo quiosque
      </div>
      <CriarQuiosqueForm eventoId={evento.id} modalidadeEvento={evento.modalidade} />
    </main>
  );
}
