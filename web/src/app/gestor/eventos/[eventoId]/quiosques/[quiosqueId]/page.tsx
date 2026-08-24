import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { EditarQuiosqueForm } from "@/components/EditarQuiosqueForm";
import { ListaProdutosPainel } from "@/components/ListaProdutosPainel";
import { ExcluirQuiosqueButton } from "@/components/ExcluirQuiosqueButton";
import { DesconectarMercadoPagoQuiosqueButton } from "@/components/DesconectarMercadoPagoQuiosqueButton";
import { UploadLogoQuiosque } from "@/components/UploadLogoQuiosque";

const MENSAGENS_ERRO_MP: Record<string, string> = {
  recusado: "O restaurante cancelou a autorização no Mercado Pago.",
  estado_invalido: "O link expirou ou é inválido — tente conectar de novo.",
  nao_configurado: "A integração com o Mercado Pago ainda não foi configurada no servidor.",
  falha_troca_token: "O Mercado Pago recusou a conexão. Tente novamente.",
  inesperado: "Erro inesperado ao conectar. Tente novamente.",
};

export default async function QuiosqueGestor({
  params,
  searchParams,
}: {
  params: { eventoId: string; quiosqueId: string };
  searchParams: { conectado?: string; erro?: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
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
        }}
      >
        <span>{quiosque.nome}</span>
        <Link href={`/gestor/eventos/${params.eventoId}`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          ‹ Voltar ao evento
        </Link>
      </div>

      <div className="painel-split">
        <div>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>Dados do quiosque</h5>
          <UploadLogoQuiosque
            apiUrl={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/logo`}
            logoUrlInicial={quiosque.logoUrl}
          />
          <div style={{ height: 16 }} />
          <EditarQuiosqueForm
            eventoId={params.eventoId}
            quiosqueId={params.quiosqueId}
            nomeInicial={quiosque.nome}
            modalidadeInicial={quiosque.modalidade}
            tipoInicial={quiosque.tipo}
            cnpjInicial={quiosque.cnpj ?? ""}
            chavePixInicial={quiosque.chavePix ?? ""}
            dicaInicial={quiosque.dica ?? ""}
            mensagemPreparandoInicial={quiosque.mensagemPreparando ?? ""}
            mensagemProntoInicial={quiosque.mensagemPronto ?? ""}
            combinaComIdInicial={quiosque.combinaComId ?? ""}
            outrosQuiosques={irmaos.filter((irmao) => irmao.id !== quiosque.id)}
          />
        </div>
        <div>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
            Produtos · nome, preço, estoque e tempo de preparo
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
            criarUrl={`/gestor/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos/novo`}
            editarUrlBase={`/gestor/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos`}
            alternarAtivoUrlBase={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos`}
            excluirUrlBase={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos`}
          />
        </div>
      </div>

      {quiosque.tipo === "INDEPENDENTE" && (
        <div className="g-sec" style={{ marginTop: 16 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
            💳 Recebimento — Mercado Pago
          </h5>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            Conecte a conta Mercado Pago do próprio restaurante pra ele receber o Pix direto na
            conta dele, com a comissão da Cathan descontada automaticamente em cada venda. Faça
            isso junto com o responsável do restaurante, já que ele vai precisar autorizar do lado
            dele.
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
              <DesconectarMercadoPagoQuiosqueButton quiosqueId={quiosque.id} />
              <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
                Vai conectar outro restaurante depois de desconectar este? O Mercado Pago
                reconecta automaticamente a mesma conta se o responsável ainda estiver logado nela
                — peça pra ele sair em{" "}
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
                href={`/api/mercado-pago/oauth/iniciar-quiosque/${quiosque.id}`}
                className="btn btn-primario btn-bloco"
              >
                Conectar Mercado Pago deste restaurante
              </a>
              <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
                Se o responsável já estiver logado em outra conta Mercado Pago no navegador, ele
                precisa sair dela primeiro em{" "}
                <a href="https://www.mercadopago.com.br" target="_blank" rel="noopener noreferrer">
                  mercadopago.com.br
                </a>
                , senão o Mercado Pago conecta essa conta errada sem perguntar.
              </p>
            </>
          )}
        </div>
      )}

      <div className="g-sec" style={{ marginTop: 16 }}>
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12, color: "#B4441C" }}>
          Zona de risco
        </h5>
        <ExcluirQuiosqueButton
          eventoId={params.eventoId}
          quiosqueId={params.quiosqueId}
          quiosqueNome={quiosque.nome}
        />
      </div>
    </main>
  );
}
