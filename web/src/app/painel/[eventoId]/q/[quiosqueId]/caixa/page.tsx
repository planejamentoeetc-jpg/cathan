import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CaixaVenda } from "@/components/CaixaVenda";
import { exigirSessaoQuiosque } from "@/lib/exigirSessaoQuiosque";

export default async function VendaManualQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
    include: {
      evento: true,
      produtos: { where: { ativo: true }, orderBy: { nome: "asc" } },
    },
  });
  if (!quiosque) notFound();
  await exigirSessaoQuiosque(quiosque, `/painel/${params.eventoId}/q/${params.quiosqueId}/caixa`);

  return (
    <main className="tela" style={{ maxWidth: 960 }}>
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
        <span>💵 Venda Manual</span>
        <Link href={`/painel/${params.eventoId}/q/${quiosque.id}`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          ‹ {quiosque.nome}
        </Link>
      </div>

      {quiosque.evento.pedidosPausados && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          Os pedidos deste evento estão pausados pelo gestor — a venda manual também fica
          bloqueada até serem retomados.
        </div>
      )}

      <CaixaVenda
        apiUrlVender={`/api/quiosques/${quiosque.id}/vender`}
        apiUrlVendas={`/api/quiosques/${quiosque.id}/vendas`}
        eventoNome={quiosque.evento.nome}
        eventoLocal={quiosque.evento.local}
        pausado={quiosque.evento.pedidosPausados}
        quiosques={[
          {
            id: quiosque.id,
            nome: quiosque.nome,
            cor: quiosque.cor,
            modalidade: quiosque.modalidade,
            produtos: quiosque.produtos.map((p) => ({
              id: p.id,
              nome: p.nome,
              preco: Number(p.preco),
            })),
          },
        ]}
      />
    </main>
  );
}
