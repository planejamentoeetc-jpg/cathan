import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FilaQuiosque } from "@/components/FilaQuiosque";
import { ListaProdutosPainel } from "@/components/ListaProdutosPainel";
import { BotaoSair } from "@/components/BotaoSair";
import { MensagensQuiosqueForm } from "@/components/MensagensQuiosqueForm";

export default async function PainelQuiosque({
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
            }))}
          />
        </div>
      </div>

      <h5 style={{ fontFamily: "var(--font-sora)", margin: "20px 0 12px" }}>
        Personalizar mensagens
      </h5>
      <MensagensQuiosqueForm
        quiosqueId={params.quiosqueId}
        dicaInicial={quiosque.dica ?? ""}
        mensagemPreparandoInicial={quiosque.mensagemPreparando ?? ""}
        mensagemProntoInicial={quiosque.mensagemPronto ?? ""}
      />
    </main>
  );
}
