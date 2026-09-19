import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/CheckoutForm";
import { SeloCathan } from "@/components/MarcaCathan";

export default async function Checkout({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    select: { id: true, nome: true, raioPedidosMetros: true, pedidosPausados: true, modoDemonstracao: true },
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
      {evento.modoDemonstracao && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          Ambiente de demonstração: nenhum pagamento real é cobrado, o pedido é confirmado na hora.
        </div>
      )}
      <CheckoutForm
        eventoId={evento.id}
        modoDemonstracao={evento.modoDemonstracao}
        exigeLocalizacao={evento.raioPedidosMetros !== null}
        pedidosPausados={evento.pedidosPausados}
      />
      <SeloCathan />
    </main>
  );
}
