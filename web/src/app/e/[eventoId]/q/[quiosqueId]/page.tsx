import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";
import { ProdutoCard } from "@/components/ProdutoCard";

export default async function LojaDoQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
    include: {
      produtos: { orderBy: { nome: "asc" } },
    },
  });

  if (!quiosque) notFound();

  return (
    <main className="tela">
      <Link href={`/e/${params.eventoId}`} className="texto-fraco">
        ‹ Praça do evento
      </Link>
      <div className="hero" style={{ background: quiosque.cor, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconeModalidade modalidade={quiosque.modalidade} />
          <div className="nome">{quiosque.nome}</div>
        </div>
      </div>

      {quiosque.dica && (
        <div className="dica-spot" style={{ borderColor: quiosque.cor, marginTop: 14 }}>
          <span className="ic">💡</span>
          <span>{quiosque.dica}</span>
        </div>
      )}

      <div className="produtos-grid">
        {quiosque.produtos.map((produto) => (
          <ProdutoCard
            key={produto.id}
            eventoId={params.eventoId}
            produto={{
              id: produto.id,
              nome: produto.nome,
              preco: Number(produto.preco),
              tempoProducaoMinutos: produto.tempoProducaoMinutos,
              estoque: produto.estoque,
              ativo: produto.ativo,
            }}
            quiosque={{
              id: quiosque.id,
              nome: quiosque.nome,
              cor: quiosque.cor,
              modalidade: quiosque.modalidade,
            }}
          />
        ))}

        {quiosque.produtos.length === 0 && (
          <p className="texto-fraco">Nenhum produto cadastrado neste quiosque ainda.</p>
        )}
      </div>

      <BarraCarrinho eventoId={params.eventoId} />
    </main>
  );
}
