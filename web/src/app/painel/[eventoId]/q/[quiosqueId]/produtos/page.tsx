import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListaProdutosPainel } from "@/components/ListaProdutosPainel";

export default async function ProdutosDoQuiosque({
  params,
}: {
  params: { eventoId: string; quiosqueId: string };
}) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId },
    include: { produtos: { orderBy: { nome: "asc" } } },
  });

  if (!quiosque) notFound();

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
        <span>{quiosque.nome} — produtos</span>
        <Link
          href={`/painel/${params.eventoId}/q/${params.quiosqueId}`}
          style={{ fontSize: 12.5, color: "#BFD4DA" }}
        >
          Voltar à fila
        </Link>
      </div>

      <ListaProdutosPainel
        produtos={quiosque.produtos.map((p) => ({ id: p.id, nome: p.nome, ativo: p.ativo }))}
      />
    </main>
  );
}
