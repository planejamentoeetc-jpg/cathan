import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoQuiosque } from "@/lib/exigirSessaoQuiosque";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";
import { GradeProdutosComBusca } from "@/components/GradeProdutosComBusca";
import { AbasQuiosques } from "@/components/AbasQuiosques";
import { DicaLoja } from "@/components/DicaLoja";

// Mesma prévia de /gestor/eventos/[eventoId]/preview/q/[quiosqueId], só que
// pro próprio restaurante ver sem precisar do login de gestor -- mesma tela
// que o cliente vai ver quando o recebedor estiver conectado.
export default async function PreviaLojaQuiosqueProprio({
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
  await exigirSessaoQuiosque(quiosque, `/painel/${params.eventoId}/q/${params.quiosqueId}/preview`);

  const irmaos = await prisma.quiosque.findMany({
    where: { eventoId: params.eventoId },
    select: { id: true, nome: true, cor: true, modalidade: true, logoUrl: true },
    orderBy: { nome: "asc" },
  });

  const semRecebedor = !quiosque.pagarmeRecipientId && !quiosque.mpAccessTokenCifrado;

  return (
    <main className="tela">
      <div className="conteudo-com-fundo">
        <div
          className="aviso"
          style={{
            marginBottom: 16,
            borderColor: "var(--pipoca)",
            background: "var(--pipoca-suave)",
            color: "#8a5a12",
          }}
        >
          👁 Prévia
          {semRecebedor && " — você ainda não tem recebedor conectado, o cliente não vê isso hoje"}
          .{" "}
          <Link href={`/painel/${params.eventoId}/q/${params.quiosqueId}`} style={{ textDecoration: "underline" }}>
            ‹ Voltar ao painel
          </Link>
        </div>

        <div className="loja-hero" style={!quiosque.imagemFundoUrl ? { background: quiosque.cor } : undefined}>
          {quiosque.imagemFundoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quiosque.imagemFundoUrl} alt="" className="loja-hero-img" />
          )}
          <div className="loja-hero-gradiente" />
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
            recebeDireto: Boolean(quiosque.mpAccessTokenCifrado) && !quiosque.pagarmeRecipientId,
          }}
        />

        <BarraCarrinho eventoId={params.eventoId} />
      </div>
    </main>
  );
}
