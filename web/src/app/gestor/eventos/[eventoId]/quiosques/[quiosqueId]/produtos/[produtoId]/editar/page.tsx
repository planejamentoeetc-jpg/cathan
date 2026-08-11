import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioProduto } from "@/components/FormularioProduto";

export default async function EditarProdutoGestor({
  params,
}: {
  params: { eventoId: string; quiosqueId: string; produtoId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });
  if (!quiosque) notFound();

  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, quiosqueId: params.quiosqueId },
  });
  if (!produto) notFound();

  const rotuloTempo =
    quiosque.modalidade === "BRINCADEIRAS"
      ? "Duração da atividade (min)"
      : "Tempo de produção (min)";

  const voltar = `/gestor/eventos/${params.eventoId}/quiosques/${params.quiosqueId}`;

  return (
    <main className="tela">
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
        <span>Editar produto</span>
        <Link href={voltar} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Cancelar
        </Link>
      </div>

      <FormularioProduto
        eventoId={params.eventoId}
        quiosqueId={params.quiosqueId}
        rotuloTempo={rotuloTempo}
        produtoInicial={{
          id: produto.id,
          nome: produto.nome,
          preco: Number(produto.preco),
          tempoProducaoMinutos: produto.tempoProducaoMinutos,
          estoque: produto.estoque,
        }}
        editarUrlBase={`/api/eventos/${params.eventoId}/quiosques/${params.quiosqueId}/produtos`}
        voltarUrl={voltar}
      />
    </main>
  );
}
