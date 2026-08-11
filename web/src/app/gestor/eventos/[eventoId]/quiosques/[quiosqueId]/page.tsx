import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditarQuiosqueForm } from "@/components/EditarQuiosqueForm";
import { ListaProdutosPainel } from "@/components/ListaProdutosPainel";
import { ExcluirQuiosqueButton } from "@/components/ExcluirQuiosqueButton";

export default async function QuiosqueGestor({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
    include: { produtos: { orderBy: { nome: "asc" } } },
  });

  if (!quiosque) notFound();

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
            }))}
            criarUrl={`/gestor/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos/novo`}
            editarUrlBase={`/gestor/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos`}
            alternarAtivoUrlBase={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos`}
          />
        </div>
      </div>

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
