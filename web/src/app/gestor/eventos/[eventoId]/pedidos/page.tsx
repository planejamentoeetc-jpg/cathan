import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
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
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
  });
  if (!evento) notFound();

  const pendentesComProblema = await prisma.pedidoPendente.findMany({
    where: { eventoId: params.eventoId, motivoFalha: { not: null } },
    orderBy: { criadoEm: "desc" },
  });

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
      rodada: sp.rodada,
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

      {pendentesComProblema.length > 0 && (
        <div className="cartao" style={{ marginBottom: 16, background: "#FBEAEA", border: "1.5px solid #F1C6C6" }}>
          <b style={{ color: "#B4441C", display: "block", marginBottom: 6 }}>
            ⚠️ {pendentesComProblema.length} pagamento(s) precisam de acerto manual
          </b>
          <p className="texto-fraco" style={{ marginBottom: 10 }}>
            O cliente pagou, mas 1 ou mais itens ficaram indisponíveis (esgotado/estoque) entre o
            pagamento e a confirmação — o resto do pedido foi criado normalmente, mas a diferença de
            valor precisa ser acertada com o cliente (dinheiro ou outro item).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendentesComProblema.map((p) => {
              const itensSnapshot = p.itens as unknown as {
                produtoId: string;
                quantidade: number;
                precoUnitario: number;
              }[];
              const valorTotal = itensSnapshot.reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13.5 }}>
                    <span>
                      {p.clienteNome} · {p.clienteCelular}
                    </span>
                    <span>
                      {valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} pago
                    </span>
                  </div>
                  <div className="texto-fraco" style={{ fontSize: 12.5, marginTop: 4 }}>
                    {p.motivoFalha}
                  </div>
                  <div className="texto-fraco" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {p.criadoEm.toLocaleString("pt-BR")} ·{" "}
                    {p.pedidoId ? "pedido parcial criado (ver abaixo)" : "nenhum pedido foi criado"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RegistroPedidos pedidos={dados} />
    </main>
  );
}
