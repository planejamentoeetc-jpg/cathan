import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CaixaVenda } from "@/components/CaixaVenda";
import { BotaoSairCaixa } from "@/components/BotaoSairCaixa";

export default async function PainelCaixa({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: {
      quiosques: {
        orderBy: { nome: "asc" },
        include: { produtos: { where: { ativo: true }, orderBy: { nome: "asc" } } },
      },
    },
  });

  if (!evento) notFound();

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
          gap: 12,
        }}
      >
        <div>
          <div>💵 Venda Manual — Caixa do Evento</div>
          <div style={{ fontSize: 12, color: "#BFD4DA", fontWeight: 400 }}>{evento.nome}</div>
        </div>
        <BotaoSairCaixa eventoId={params.eventoId} />
      </div>

      {evento.pedidosPausados && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          Os pedidos deste evento estão pausados pelo gestor — a venda manual também fica
          bloqueada até serem retomados.
        </div>
      )}

      <CaixaVenda
        eventoId={evento.id}
        pausado={evento.pedidosPausados}
        quiosques={evento.quiosques.map((q) => ({
          id: q.id,
          nome: q.nome,
          cor: q.cor,
          modalidade: q.modalidade,
          produtos: q.produtos.map((p) => ({
            id: p.id,
            nome: p.nome,
            preco: Number(p.preco),
          })),
        }))}
      />
    </main>
  );
}
