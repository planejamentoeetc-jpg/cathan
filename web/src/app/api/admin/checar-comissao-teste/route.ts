import { Payment } from "mercadopago";
import { NextResponse } from "next/server";
import { obterClienteOrganizador } from "@/lib/mercadoPagoOrganizador";
import { prisma } from "@/lib/prisma";

// sem isso o Next tenta pré-renderizar essa rota durante o próprio build,
// gravando uma resposta (inclusive de erro) como se fosse estática pra
// sempre, em vez de consultar o banco a cada visita de verdade.
export const dynamic = "force-dynamic";

// Rota temporária, só pra conferir se o application_fee do teste real de
// comissão (organizador único) foi de fato retido. Ver memória
// cathan-split-payment-status. Apagar depois de usar.
export async function GET() {
  const organizador = await prisma.organizador.findUnique({
    where: { email: "teste-comissao-mp@cathan.com.br" },
  });
  if (!organizador) {
    return NextResponse.json({ erro: "Organizador de teste não encontrado." }, { status: 404 });
  }

  const pedidoPendente = await prisma.pedidoPendente.findFirst({
    where: { evento: { organizadorId: organizador.id } },
    orderBy: { criadoEm: "desc" },
  });
  if (!pedidoPendente || !pedidoPendente.mpPaymentId) {
    return NextResponse.json({ erro: "Nenhum pagamento encontrado ainda pra esse organizador de teste." }, { status: 404 });
  }

  const cliente = await obterClienteOrganizador(organizador);
  if (!cliente) {
    return NextResponse.json({ erro: "Organizador de teste não está com o Mercado Pago conectado." }, { status: 400 });
  }

  const pagamento = await new Payment(cliente).get({ id: pedidoPendente.mpPaymentId });

  return NextResponse.json({
    paymentId: pagamento.id,
    status: pagamento.status,
    status_detail: pagamento.status_detail,
    transaction_amount: pagamento.transaction_amount,
    fee_details: pagamento.fee_details,
    collector_id: pagamento.collector_id,
  });
}
