"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { usePollingEconomico } from "@/lib/usePollingEconomico";
import { AvisoPollingPausado } from "@/components/AvisoPollingPausado";

// Páginas do gestor/admin são Server Components (buscam os dados no servidor a
// cada carregamento), sem nenhum polling client-side — por isso ficavam paradas
// até alguém recarregar a página manualmente. router.refresh() busca os dados de
// novo no servidor e atualiza a árvore in-place, sem recarregar a página inteira
// nem perder o estado dos componentes client (scroll, campos abertos, etc.).
// Como router.refresh() não devolve os dados, aqui só a interação do usuário
// conta como atividade: dashboard sem ninguém mexendo pausa após 15 min.
export function AutoRefresh({ intervaloMs = 8000 }: { intervaloMs?: number }) {
  const router = useRouter();
  const atualizar = useCallback(() => router.refresh(), [router]);
  const { pausado, retomar } = usePollingEconomico(atualizar, intervaloMs, { pausarAposMs: 15 * 60 * 1000 });

  return <AvisoPollingPausado pausado={pausado} onRetomar={retomar} />;
}
