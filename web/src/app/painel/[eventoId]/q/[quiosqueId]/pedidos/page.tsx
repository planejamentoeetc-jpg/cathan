import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RegistroPedidos, type PedidoRegistro } from "@/components/RegistroPedidos";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function RegistroPedidosQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });
  if (!quiosque) notFound();

  const subPedidos = await prisma.subPedido.findMany({
    where: { quiosqueId: params.quiosqueId },
    orderBy: { criadoEm: "desc" },
    include: {
      pedido: {
        include: {
          cliente: { select: { nome: true, celular: true } },
        },
      },
      itens: { include: { produto: { select: { nome: true } } } },
    },
  });

  // Cada sub-pedido vira o próprio "pedido" na listagem -- daqui só interessa
  // a venda deste quiosque, mesmo que o cliente tenha comprado de mais
  // restaurantes junto (isso não aparece aqui, só o que é deste quiosque).
  const dados: PedidoRegistro[] = subPedidos.map((sp) => ({
    id: sp.id,
    criadoEm: sp.criadoEm.toISOString(),
    clienteNome: sp.pedido.cliente.nome,
    clienteCelular: sp.pedido.cliente.celular,
    formaPagamento: sp.pedido.formaPagamento,
    subPedidos: [
      {
        id: sp.id,
        status: sp.status,
        codigoRetirada: sp.codigoRetirada,
        rodada: sp.rodada,
        quiosqueNome: quiosque.nome,
        quiosqueCor: quiosque.cor,
        criadoEm: sp.criadoEm.toISOString(),
        aceitoEm: sp.aceitoEm?.toISOString() ?? null,
        prontoEm: sp.prontoEm?.toISOString() ?? null,
        retiradoEm: sp.retiradoEm?.toISOString() ?? null,
        chamadoEm: sp.chamadoEm?.toISOString() ?? null,
        concluidoEm: sp.concluidoEm?.toISOString() ?? null,
        itens: sp.itens.map((item) => ({
          id: item.id,
          nome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario),
          observacao: item.observacao,
          nomesCriancas: item.nomesCriancas,
          quantidadeLiberada: item.quantidadeLiberada,
        })),
      },
    ],
  }));

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
        <span>Registro de pedidos</span>
        <Link href={`/painel/${params.eventoId}/q/${quiosque.id}`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          ‹ {quiosque.nome}
        </Link>
      </div>

      <p className="texto-fraco" style={{ marginBottom: 16 }}>
        Todo pedido pago do seu quiosque, com itens, forma de pagamento e horário de cada etapa —
        use pra conferir com um cliente que aparecer com alguma dúvida ou reclamação.
      </p>

      <RegistroPedidos pedidos={dados} />
    </main>
  );
}
