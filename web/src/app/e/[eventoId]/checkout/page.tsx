import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/CheckoutForm";

export default async function Checkout({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    select: { id: true, nome: true, raioPedidosMetros: true, pedidosPausados: true },
  });

  if (!evento) notFound();

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Checkout — {evento.nome}
      </div>
      {evento.pedidosPausados && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          Os pedidos deste evento estão temporariamente pausados pelo organizador. Tente
          novamente em instantes.
        </div>
      )}
      <CheckoutForm
        eventoId={evento.id}
        exigeLocalizacao={evento.raioPedidosMetros !== null}
        pedidosPausados={evento.pedidosPausados}
      />
    </main>
  );
}
