"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Páginas do gestor/admin são Server Components (buscam os dados no servidor a
// cada carregamento), sem nenhum polling client-side — por isso ficavam paradas
// até alguém recarregar a página manualmente. router.refresh() busca os dados de
// novo no servidor e atualiza a árvore in-place, sem recarregar a página inteira
// nem perder o estado dos componentes client (scroll, campos abertos, etc.).
export function AutoRefresh({ intervaloMs = 8000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(intervalo);
  }, [router, intervaloMs]);

  return null;
}
