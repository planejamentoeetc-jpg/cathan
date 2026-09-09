import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";
import { GradeProdutosComBusca } from "@/components/GradeProdutosComBusca";
import { AbasQuiosques } from "@/components/AbasQuiosques";
import { DicaLoja } from "@/components/DicaLoja";

export default async function LojaDoQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  // restaurante independente sem Mercado Pago conectado ainda não pode receber
  // pagamento -- tratado como não existente pro cliente, mesma regra da praça
  // do evento (ver e/[eventoId]/page.tsx)
  const disponivelParaCliente = { OR: [{ tipo: "DO_EVENTO" as const }, { mpAccessTokenCifrado: { not: null } }] };

  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, ...disponivelParaCliente },
    include: {
      produtos: { orderBy: { nome: "asc" } },
      combinaCom: { select: { id: true, nome: true, cor: true } },
    },
  });

  if (!quiosque) notFound();

  const irmaos = await prisma.quiosque.findMany({
    where: { eventoId: params.eventoId, ...disponivelParaCliente },
    select: { id: true, nome: true, cor: true, modalidade: true, logoUrl: true },
    orderBy: { nome: "asc" },
  });

  return (
    // o hero fotográfico abaixo agora cumpre o papel que a imagem de fundo de
    // página inteira cumpria antes (ver .com-fundo/.fundo-imagem-tela em
    // globals.css, ainda usado na praça do evento) -- as duas juntas brigavam
    // pela atenção e deixavam o resto da tela ilegível, então aqui é sempre
    // fundo sólido (.tela puro), sem a imagem de fundo por trás do conteúdo.
    <main className="tela">
      <div className="conteudo-com-fundo">
        <div className="loja-hero" style={!quiosque.imagemFundoUrl ? { background: quiosque.cor } : undefined}>
          {quiosque.imagemFundoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quiosque.imagemFundoUrl} alt="" className="loja-hero-img" />
          )}
          <div className="loja-hero-gradiente" />
          <Link href={`/e/${params.eventoId}`} className="loja-hero-voltar">
            ‹ Praça do evento
          </Link>
        </div>

        <div className="loja-selo-wrap">
          <div className="loja-selo" style={{ background: quiosque.logoUrl ? undefined : quiosque.cor }}>
            {quiosque.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={quiosque.logoUrl} alt={quiosque.nome} />
            ) : (
              <IconeModalidade modalidade={quiosque.modalidade} tamanho={34} />
            )}
          </div>
        </div>

        <div className="loja-cabecalho">
          <h1 className="loja-nome">{quiosque.nome}</h1>
        </div>

        {irmaos.length > 1 && (
          <AbasQuiosques eventoId={params.eventoId} irmaos={irmaos} atualId={quiosque.id} />
        )}

        <div style={{ marginTop: 14 }}>
          <DicaLoja
            eventoId={params.eventoId}
            quiosqueId={quiosque.id}
            dica={quiosque.dica}
            parceiro={quiosque.combinaCom}
          />
        </div>

        <GradeProdutosComBusca
          eventoId={params.eventoId}
          produtos={quiosque.produtos.map((produto) => ({
            id: produto.id,
            nome: produto.nome,
            preco: Number(produto.preco),
            tempoProducaoMinutos: produto.tempoProducaoMinutos,
            estoque: produto.estoque,
            ativo: produto.ativo,
            fotoUrl: produto.fotoUrl,
          }))}
          quiosque={{
            id: quiosque.id,
            nome: quiosque.nome,
            cor: quiosque.cor,
            modalidade: quiosque.modalidade,
            recebeDireto: Boolean(quiosque.mpAccessTokenCifrado),
          }}
        />

        <BarraCarrinho eventoId={params.eventoId} />
      </div>
    </main>
  );
}
