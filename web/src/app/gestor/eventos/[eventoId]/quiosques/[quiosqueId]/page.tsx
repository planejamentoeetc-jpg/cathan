import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { EditarQuiosqueForm } from "@/components/EditarQuiosqueForm";
import { ListaProdutosPainel } from "@/components/ListaProdutosPainel";
import { ExcluirQuiosqueButton } from "@/components/ExcluirQuiosqueButton";
import { DesconectarMercadoPagoQuiosqueButton } from "@/components/DesconectarMercadoPagoQuiosqueButton";
import { ConectarPagarMeQuiosque } from "@/components/ConectarPagarMeQuiosque";
import { UploadLogoQuiosque } from "@/components/UploadLogoQuiosque";
import { UploadImagemFundo } from "@/components/UploadImagemFundo";
import { DefinirSenhaQuiosque } from "@/components/DefinirSenhaQuiosque";

export default async function QuiosqueGestor({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
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
          <UploadImagemFundo
            apiUrl={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/imagem-fundo`}
            imagemUrlInicial={quiosque.imagemFundoUrl}
            titulo="Imagem de fundo da loja"
            descricao="Aparece atrás do cardápio quando o cliente entra na loja deste restaurante. Sem imagem, fica o fundo padrão do Cathan."
          />
          <div style={{ height: 16 }} />
          <EditarQuiosqueForm
            eventoId={params.eventoId}
            quiosqueId={params.quiosqueId}
            nomeInicial={quiosque.nome}
            modalidadeInicial={quiosque.modalidade}
            tipoInicial={quiosque.tipo}
            dicaInicial={quiosque.dica ?? ""}
            mensagemPreparandoInicial={quiosque.mensagemPreparando ?? ""}
            mensagemProntoInicial={quiosque.mensagemPronto ?? ""}
            combinaComIdInicial={quiosque.combinaComId ?? ""}
            outrosQuiosques={irmaos.filter((irmao) => irmao.id !== quiosque.id)}
          />
          {quiosque.tipo === "INDEPENDENTE" && (
            <>
              <div style={{ height: 16 }} />
              <DefinirSenhaQuiosque
                apiUrl={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/senha`}
                temSenhaInicial={Boolean(quiosque.senhaHash)}
              />
            </>
          )}
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
            💠 Recebimento — Pagar.me
          </h5>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            É o recebedor oficial da Cathan: o restaurante recebe a parte dele automaticamente em
            todo pedido, mesmo quando o cliente monta um carrinho com itens de mais de um
            restaurante independente — a divisão acontece sozinha, o que o Mercado Pago não faz.
          </p>
          <ConectarPagarMeQuiosque
            apiUrl={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/pagarme-recebedor`}
            jaConectado={Boolean(quiosque.pagarmeRecipientId)}
            statusInicial={quiosque.pagarmeRecipientStatus}
            cnpjInicial={quiosque.cnpj ?? ""}
            nomeInicial={quiosque.nome}
          />
        </div>
      )}

      {quiosque.tipo === "INDEPENDENTE" && conectadoMp && (
        <div className="g-sec" style={{ marginTop: 16 }}>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
            💳 Recebimento — Mercado Pago <span className="texto-fraco" style={{ fontWeight: 400 }}>(legado)</span>
          </h5>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            Restaurante só com Mercado Pago não pode dividir carrinho com outro restaurante —
            precisa de pedido separado. Cadastre o Pagar.me acima pra não ter essa limitação.
          </p>

          <div className="g-row" style={{ marginBottom: 14 }}>
            Status
            <span className="val" style={{ color: "var(--verde)" }}>
              ✓ conectado
            </span>
          </div>
          <DesconectarMercadoPagoQuiosqueButton
            apiUrl={`/api/mercado-pago/oauth/desconectar-quiosque/${quiosque.id}`}
          />
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
