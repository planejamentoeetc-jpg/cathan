import { prisma } from "@/lib/prisma";
import { BuscaEventos } from "@/components/BuscaEventos";

// duração estimada de um evento pra fins de "em andamento" — o cadastro só
// tem hora de início, sem hora de fim; ver pergunta ao usuário sobre isso.
const JANELA_EM_ANDAMENTO_HORAS = 6;

// Página pública de descoberta: cliente busca o evento dele ou vê o que está
// rolando agora. Renderização forçada dinâmica — "em andamento" depende do
// horário exato da requisição, não pode ser congelado em build estático.
export const dynamic = "force-dynamic";

export default async function Home() {
  const eventos = await prisma.evento.findMany({ orderBy: { data: "desc" } });

  const agora = Date.now();
  const janelaMs = JANELA_EM_ANDAMENTO_HORAS * 60 * 60 * 1000;

  const eventosComStatus = eventos.map((evento) => {
    const inicio = evento.data.getTime();
    return {
      id: evento.id,
      nome: evento.nome,
      local: evento.local,
      emAndamento: agora >= inicio && agora <= inicio + janelaMs,
    };
  });

  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Cathan — Encontre seu evento
      </div>

      <BuscaEventos eventos={eventosComStatus} />
    </main>
  );
}
