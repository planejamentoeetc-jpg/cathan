import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/CheckoutForm";

export default async function Checkout({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    select: { id: true, nome: true, raioPedidosMetros: true },
  });

  if (!evento) notFound();

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Checkout — {evento.nome}
      </div>
      <CheckoutForm eventoId={evento.id} exigeLocalizacao={evento.raioPedidosMetros !== null} />
    </main>
  );
}
