import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RegistroPedidos, type PedidoRegistro } from "@/components/RegistroPedidos";
import { AutoRefresh } from "@/components/AutoRefresh";

// sem chamada a cookies()/headers(), o Next marcaria esta página como estática —
// ver o mesmo problema já corrigido em /gestor e /admin.
export const dynamic = "force-dynamic";

export default async function RegistroPedidosPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) notFound();

  const pedidos = await prisma.pedido.findMany({
    where: { eventoId: params.eventoId },
    orderBy: { criadoEm: "desc" },
    include: {
      cliente: { select: { nome: true, celular: true } },
      subPedidos: {
        orderBy: { criadoEm: "asc" },
        include: {
          quiosque: { select: { nome: true, cor: true } },
          itens: { include: { produto: { select: { nome: true } } } },
        },
      },
    },
  });

  const dados: PedidoRegistro[] = pedidos.map((p) => ({
    id: p.id,
    criadoEm: p.criadoEm.toISOString(),
    clienteNome: p.cliente.nome,
    clienteCelular: p.cliente.celular,
    formaPagamento: p.formaPagamento,
    subPedidos: p.subPedidos.map((sp) => ({
      id: sp.id,
      status: sp.status,
      codigoRetirada: sp.codigoRetirada,
      quiosqueNome: sp.quiosque.nome,
      quiosqueCor: sp.quiosque.cor,
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
    })),
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
        <Link href={`/gestor/eventos/${evento.id}`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          ‹ {evento.nome}
        </Link>
      </div>

      <p className="texto-fraco" style={{ marginBottom: 16 }}>
        Todo pedido pago do evento, com itens, forma de pagamento e horário de cada etapa —
        use pra conferir com um cliente que aparecer no quiosque com alguma dúvida ou reclamação.
      </p>

      <RegistroPedidos pedidos={dados} />
    </main>
  );
}
