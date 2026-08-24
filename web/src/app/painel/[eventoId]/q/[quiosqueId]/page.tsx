import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FilaQuiosque } from "@/components/FilaQuiosque";
import { ListaProdutosPainel } from "@/components/ListaProdutosPainel";
import { BotaoSair } from "@/components/BotaoSair";
import { MensagensQuiosqueForm } from "@/components/MensagensQuiosqueForm";
import { UploadLogoQuiosque } from "@/components/UploadLogoQuiosque";
import { DesconectarMercadoPagoQuiosqueButton } from "@/components/DesconectarMercadoPagoQuiosqueButton";

const MENSAGENS_ERRO_MP: Record<string, string> = {
  recusado: "Você cancelou a autorização no Mercado Pago.",
  estado_invalido: "O link expirou ou é inválido — tente conectar de novo.",
  nao_configurado: "A integração com o Mercado Pago ainda não foi configurada no servidor.",
  falha_troca_token: "O Mercado Pago recusou a conexão. Tente novamente.",
  inesperado: "Erro inesperado ao conectar. Tente novamente.",
};

export default async function PainelQuiosque({
  params,
  searchParams,
}: {
  params: { eventoId: string; quiosqueId: string };
  searchParams: { conectado?: string; erro?: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
    include: { produtos: { orderBy: { nome: "asc" } } },
  });

  if (!quiosque) notFound();

  const conectadoMp = Boolean(quiosque.mpUserId);

  const irmaos = await prisma.quiosque.findMany({
    where: { eventoId: params.eventoId },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

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
          flexWrap: "wrap",
        }}
      >
        <span>{quiosque.nome}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="quiosque-switcher">
            {irmaos.map((irmao) => (
              <Link
                key={irmao.id}
                href={`/painel/${params.eventoId}/q/${irmao.id}`}
                className={irmao.id === quiosque.id ? "sel" : ""}
              >
                {irmao.nome.split(" ")[0]}
              </Link>
            ))}
          </div>
          <BotaoSair eventoId={params.eventoId} />
        </div>
      </div>

      <div className="painel-split">
        <div>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>Fila de pedidos</h5>
          <FilaQuiosque quiosqueId={params.quiosqueId} />

          <h5 style={{ fontFamily: "var(--font-sora)", margin: "20px 0 12px" }}>Logo</h5>
          <UploadLogoQuiosque
            apiUrl={`/api/quiosques/${params.quiosqueId}/logo`}
            logoUrlInicial={quiosque.logoUrl}
          />
        </div>
        <div>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
            Meus produtos · cadastre, edite e controle o estoque
          </h5>
          <ListaProdutosPainel
            eventoId={params.eventoId}
            quiosqueId={params.quiosqueId}
            produtos={quiosque.produtos.map((p) => ({
              id: p.id,
              nome: p.nome,
              preco: Number(p.preco),
              ativo: p.ativo,
              fotoUrl: p.fotoUrl,
            }))}
          />
        </div>
      </div>

      {quiosque.tipo === "INDEPENDENTE" && (
        <div className="g-sec" style={{ marginTop: 16 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
            💳 Recebimento — Mercado Pago
          </h5>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            Conecte sua própria conta Mercado Pago pra receber o Pix direto na sua conta, com a
            comissão da Cathan descontada automaticamente em cada venda — sem isso, seu
            estabelecimento não aparece pros clientes do evento.
          </p>

          {searchParams.conectado && conectadoMp && (
            <div
              className="aviso"
              style={{ marginBottom: 14, borderColor: "var(--verde)", background: "var(--verde-suave)", color: "var(--verde)" }}
            >
              ✓ Conta Mercado Pago conectada com sucesso!
            </div>
          )}
          {searchParams.erro && (
            <div className="aviso" style={{ marginBottom: 14 }}>
              {MENSAGENS_ERRO_MP[searchParams.erro] ?? "Não foi possível conectar."}
            </div>
          )}

          {conectadoMp ? (
            <>
              <div className="g-row" style={{ marginBottom: 14 }}>
                Status
                <span className="val" style={{ color: "var(--verde)" }}>
                  ✓ conectado
                </span>
              </div>
              <DesconectarMercadoPagoQuiosqueButton
                apiUrl={`/api/quiosques/${quiosque.id}/mercado-pago/desconectar`}
              />
              <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
                Vai conectar outra conta depois de desconectar? O Mercado Pago reconecta
                automaticamente a mesma conta se você ainda estiver logado nela — saia em{" "}
                <a href="https://www.mercadopago.com.br" target="_blank" rel="noopener noreferrer">
                  mercadopago.com.br
                </a>{" "}
                antes de conectar a conta certa.
              </p>
            </>
          ) : (
            <>
              <div className="g-row" style={{ marginBottom: 14 }}>
                Status
                <span className="val" style={{ color: "var(--festa)" }}>
                  não conectado — invisível pro cliente até conectar
                </span>
              </div>
              <a
                href={`/api/quiosques/${quiosque.id}/mercado-pago/iniciar`}
                className="btn btn-primario btn-bloco"
              >
                Conectar minha conta Mercado Pago
              </a>
              <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
                Se você já estiver logado em outra conta Mercado Pago no navegador, saia dela
                primeiro em{" "}
                <a href="https://www.mercadopago.com.br" target="_blank" rel="noopener noreferrer">
                  mercadopago.com.br
                </a>
                , senão o Mercado Pago conecta essa conta errada sem perguntar.
              </p>
            </>
          )}
        </div>
      )}

      <h5 style={{ fontFamily: "var(--font-sora)", margin: "20px 0 12px" }}>
        Personalizar mensagens
      </h5>
      <MensagensQuiosqueForm
        quiosqueId={params.quiosqueId}
        dicaInicial={quiosque.dica ?? ""}
        mensagemPreparandoInicial={quiosque.mensagemPreparando ?? ""}
        mensagemProntoInicial={quiosque.mensagemPronto ?? ""}
        combinaComIdInicial={quiosque.combinaComId ?? ""}
        outrosQuiosques={irmaos.filter((irmao) => irmao.id !== quiosque.id)}
      />
    </main>
  );
}
