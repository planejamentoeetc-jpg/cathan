import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioProduto } from "@/components/FormularioProduto";
import { UploadFotoProduto } from "@/components/UploadFotoProduto";
import { exigirSessaoQuiosque } from "@/lib/exigirSessaoQuiosque";

export default async function EditarProduto({
  params,
}: {
  params: { eventoId: string; quiosqueId: string; produtoId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
  });
  if (!quiosque) notFound();
  await exigirSessaoQuiosque(
    quiosque,
    `/painel/${params.eventoId}/q/${params.quiosqueId}/produtos/${params.produtoId}/editar`
  );

  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, quiosqueId: params.quiosqueId },
  });
  if (!produto) notFound();

  const rotuloTempo =
    quiosque.modalidade === "BRINCADEIRAS"
      ? "Duração da atividade (min)"
      : "Tempo de produção (min)";

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
        <Link
          href={`/painel/${params.eventoId}/q/${params.quiosqueId}`}
          style={{ fontSize: 12.5, color: "#BFD4DA" }}
        >
          Cancelar
        </Link>
      </div>

      <div className="cartao">
        <UploadFotoProduto
          apiUrl={`/api/quiosques/${params.quiosqueId}/produtos/${produto.id}/foto`}
          fotoUrlInicial={produto.fotoUrl}
        />
      </div>
      <div style={{ height: 16 }} />

      <FormularioProduto
        eventoId={params.eventoId}
        quiosqueId={params.quiosqueId}
        rotuloTempo={rotuloTempo}
        temCampoTempo={quiosque.modalidade !== "BEBIDAS"}
        produtoInicial={{
          id: produto.id,
          nome: produto.nome,
          preco: Number(produto.preco),
          tempoProducaoMinutos: produto.tempoProducaoMinutos,
          estoque: produto.estoque,
        }}
      />
    </main>
  );
}
