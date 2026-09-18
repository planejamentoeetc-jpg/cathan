import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { STATUS_ATIVOS } from "@/lib/statusSubPedido";
import { calcularEsperaEstimadaMinutos, formatarEspera } from "@/lib/esperaEstimada";
import { IconeModalidade } from "@/components/IconeModalidade";
import { BarraCarrinho } from "@/components/BarraCarrinho";

// Mesma tela que o cliente vê em /e/[eventoId], só que sem o filtro de
// recebedor conectado -- deixa o gestor conferir ícone, cor e cardápio de um
// quiosque ANTES de cadastrar o recebedor Pagar.me/Mercado Pago dele. O
// cliente de verdade continua sem ver nada disso enquanto não conectar (ver
// e/[eventoId]/page.tsx) -- esta rota vive só dentro do /gestor, protegida
// pelo mesmo login de sempre.
export default async function PreviaPracaDoEvento({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
    include: {
      quiosques: {
        orderBy: { nome: "asc" },
        include: {
          produtos: { where: { ativo: true }, select: { tempoProducaoMinutos: true } },
          subPedidos: { where: { status: { in: STATUS_ATIVOS } }, select: { id: true } },
        },
      },
    },
  });

  if (!evento) notFound();

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
        <div
          className="aviso"
          style={{
            marginBottom: 16,
            borderColor: "var(--pipoca)",
            background: "var(--pipoca-suave)",
            color: "#8a5a12",
          }}
        >
          👁 Prévia do gestor — mostra todos os quiosques, mesmo sem recebedor conectado. O cliente
          só vê o que já está pronto pra receber pagamento.{" "}
          <Link href={`/gestor/eventos/${evento.id}`} style={{ textDecoration: "underline" }}>
            Voltar ao evento
          </Link>
        </div>

        <div className="hero">
          <div className="nome">{evento.nome}</div>
          <div className="sub">{evento.local}</div>
        </div>

        {evento.quiosques.length > 0 && evento.modalidade === "MULTI_ESTABELECIMENTO" && (
          <>
            <p className="texto-fraco" style={{ marginBottom: 8 }}>
              Toque num estabelecimento pra ver o cardápio:
            </p>
            <div className="praca-icones-grid">
              {evento.quiosques.map((quiosque) => {
                const semRecebedor = !quiosque.pagarmeRecipientId && !quiosque.mpAccessTokenCifrado;
                return (
                  <Link
                    key={quiosque.id}
                    href={`/gestor/eventos/${evento.id}/preview/q/${quiosque.id}`}
                    className="praca-icone"
                    style={semRecebedor ? { opacity: 0.55 } : undefined}
                  >
                    <div
                      className="praca-icone-imagem"
                      style={{ background: quiosque.logoUrl ? undefined : quiosque.cor }}
                    >
                      {quiosque.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={quiosque.logoUrl} alt={quiosque.nome} />
                      ) : (
                        <IconeModalidade modalidade={quiosque.modalidade} />
                      )}
                    </div>
                    <b>{quiosque.nome}</b>
                    {semRecebedor && (
                      <span style={{ fontSize: 10.5, color: "var(--festa)", fontWeight: 700 }}>
                        sem recebedor
                      </span>
                    )}
                  </Link>
                );
              })}
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
                  <Link
                    key={quiosque.id}
                    href={`/gestor/eventos/${evento.id}/preview/q/${quiosque.id}`}
                    className="quiosque-aba"
                  >
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
