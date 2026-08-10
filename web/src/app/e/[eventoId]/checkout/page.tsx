import Link from "next/link";
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
      <div className="topo" style={{ borderRadius: 18, marginBottom: 10 }}>
        Checkout — {evento.nome}
      </div>
      <Link href={`/e/${evento.id}`} className="texto-fraco" style={{ display: "inline-block", marginBottom: 16 }}>
        ‹ Continuar comprando
      </Link>
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
