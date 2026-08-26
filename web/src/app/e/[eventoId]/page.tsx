import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";
import { calcularEsperaEstimadaMinutos, formatarEspera } from "@/lib/esperaEstimada";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";
import { MeusPedidosBanner } from "@/components/MeusPedidosBanner";

export default async function PracaDoEvento({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: {
      quiosques: {
        // restaurante independente sem conta Mercado Pago conectada ainda não
        // pode receber pagamento nenhum -- fica invisível pro cliente até o
        // gestor completar a conexão (ver /gestor/eventos/[eventoId]/quiosques/[quiosqueId])
        where: { OR: [{ tipo: "DO_EVENTO" }, { mpAccessTokenCifrado: { not: null } }] },
        orderBy: { nome: "asc" },
        include: {
          produtos: {
            where: { ativo: true },
            select: { tempoProducaoMinutos: true },
          },
          // fatias ainda na fila de produção (não retiradas/canceladas)
          subPedidos: {
            where: { status: { in: STATUS_ATIVOS } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!evento) notFound();

  const quiosquesComDica = evento.quiosques.filter((q) => q.dica);
  const dicaEmDestaque =
    quiosquesComDica.length > 0
      ? quiosquesComDica[Math.floor(Math.random() * quiosquesComDica.length)]
      : null;

  return (
    <main className={evento.imagemFundoUrl ? "tela com-fundo" : "tela"}>
      {evento.imagemFundoUrl && (
        <div
          aria-hidden
          className="fundo-imagem-tela"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10,26,26,0.35), rgba(10,26,26,0.78)), url(${evento.imagemFundoUrl})`,
          }}
        />
      )}
      <div className="conteudo-com-fundo">
        <div className="hero">
          <div className="nome">{evento.nome}</div>
          <div className="sub">{evento.local}</div>
        </div>

        <MeusPedidosBanner eventoId={evento.id} />

        {evento.pedidosPausados && (
          <div className="aviso" style={{ marginBottom: 16 }}>
            Os pedidos deste evento estão temporariamente pausados pelo organizador. Você ainda
            pode navegar pelos quiosques, mas não será possível finalizar a compra agora.
          </div>
        )}

        {dicaEmDestaque && (
          <div className="dica-spot" style={{ borderColor: dicaEmDestaque.cor }}>
            <span className="ic">💡</span>
            <span>
              <b>Fica a dica:</b> {dicaEmDestaque.dica}{" "}
              <Link href={`/e/${evento.id}/q/${dicaEmDestaque.id}`} className="ir" style={{ color: dicaEmDestaque.cor }}>
                Visitar {dicaEmDestaque.nome} ›
              </Link>
            </span>
          </div>
        )}

        {evento.quiosques.length > 0 && evento.modalidade === "MULTI_ESTABELECIMENTO" && (
          <>
            <p className="texto-fraco" style={{ marginBottom: 8 }}>
              Toque num estabelecimento pra ver o cardápio:
            </p>
            <div className="praca-icones-grid">
              {evento.quiosques.map((quiosque) => (
                <Link key={quiosque.id} href={`/e/${evento.id}/q/${quiosque.id}`} className="praca-icone">
                  <div className="praca-icone-imagem" style={{ background: quiosque.logoUrl ? undefined : quiosque.cor }}>
                    {quiosque.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={quiosque.logoUrl} alt={quiosque.nome} />
                    ) : (
                      <IconeModalidade modalidade={quiosque.modalidade} />
                    )}
                  </div>
                  <b>{quiosque.nome}</b>
                </Link>
              ))}
            </div>
          </>
        )}

        {evento.quiosques.length > 0 && evento.modalidade !== "MULTI_ESTABELECIMENTO" && (
          <>
            <p className="texto-fraco" style={{ marginBottom: 8 }}>
              Toque num quiosque pra ver o cardápio:
            </p>
            <div className="quiosques-grid">
              {evento.quiosques.map((quiosque) => {
                const esperaMinutos = calcularEsperaEstimadaMinutos(
                  quiosque.produtos.map((p) => p.tempoProducaoMinutos),
                  quiosque.subPedidos.length
                );

                return (
                  <Link key={quiosque.id} href={`/e/${evento.id}/q/${quiosque.id}`} className="quiosque-aba">
                    <div className="quiosque-logo" style={{ background: quiosque.cor }}>
                      <IconeModalidade modalidade={quiosque.modalidade} />
                    </div>
                    <b>{quiosque.nome}</b>
                    <div className="espera">{formatarEspera(esperaMinutos)}</div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}

        <BarraCarrinho eventoId={evento.id} />
      </div>
    </main>
  );
}
