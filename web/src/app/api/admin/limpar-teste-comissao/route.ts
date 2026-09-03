import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rota temporária, só pra apagar os dados do teste real de application_fee
// (organizador, evento, quiosque, produto, pedido pendente). Ver memória
// cathan-split-payment-status. Apagar esse arquivo depois de usar, junto
// com seed-teste-comissao e checar-comissao-teste.
export async function GET() {
  const organizador = await prisma.organizador.findUnique({
    where: { email: "teste-comissao-mp@cathan.com.br" },
  });
  if (!organizador) {
    return NextResponse.json({ ok: true, mensagem: "Nada pra apagar, organizador de teste não existe." });
  }

  const eventos = await prisma.evento.findMany({ where: { organizadorId: organizador.id } });
  const eventoIds = eventos.map((e) => e.id);

  await prisma.pedidoPendente.deleteMany({ where: { eventoId: { in: eventoIds } } });
  await prisma.subPedido.deleteMany({ where: { pedido: { eventoId: { in: eventoIds } } } });
  await prisma.pedido.deleteMany({ where: { eventoId: { in: eventoIds } } });
  await prisma.produto.deleteMany({ where: { quiosque: { eventoId: { in: eventoIds } } } });
  await prisma.quiosque.deleteMany({ where: { eventoId: { in: eventoIds } } });
  await prisma.evento.deleteMany({ where: { organizadorId: organizador.id } });
  await prisma.organizador.delete({ where: { id: organizador.id } });

  return NextResponse.json({ ok: true, apagado: { organizadorId: organizador.id, eventos: eventoIds.length } });
}
