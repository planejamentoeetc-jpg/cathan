import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";
import { ProdutoCard } from "@/components/ProdutoCard";
import { DicaLoja } from "@/components/DicaLoja";

export default async function LojaDoQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
    include: {
      produtos: { orderBy: { nome: "asc" } },
      combinaCom: { select: { id: true, nome: true, cor: true } },
    },
  });

  if (!quiosque) notFound();

  const irmaos = await prisma.quiosque.findMany({
    where: { eventoId: params.eventoId },
    select: { id: true, nome: true, cor: true, modalidade: true },
    orderBy: { nome: "asc" },
  });

  return (
    <main className="tela">
      <Link href={`/e/${params.eventoId}`} className="btn btn-secundario" style={{ marginBottom: 12 }}>
        ‹ Praça do evento
      </Link>

      {irmaos.length > 1 && (
        <div className="quiosques-abas" style={{ marginBottom: 4 }}>
          {irmaos.map((irmao) => (
            <Link
              key={irmao.id}
              href={`/e/${params.eventoId}/q/${irmao.id}`}
              className="quiosque-aba"
              style={irmao.id === quiosque.id ? { borderColor: irmao.cor, borderWidth: 2 } : undefined}
            >
              <div className="quiosque-logo" style={{ background: irmao.cor }}>
                <IconeModalidade modalidade={irmao.modalidade} />
              </div>
              <b>{irmao.nome}</b>
            </Link>
          ))}
        </div>
      )}

      <div className="hero" style={{ background: quiosque.cor, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconeModalidade modalidade={quiosque.modalidade} />
          <div className="nome">{quiosque.nome}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <DicaLoja
          eventoId={params.eventoId}
          quiosqueId={quiosque.id}
          dica={quiosque.dica}
          parceiro={quiosque.combinaCom}
        />
      </div>

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
