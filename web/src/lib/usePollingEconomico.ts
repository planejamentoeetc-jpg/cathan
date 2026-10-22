"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Polling que não deixa o banco (Neon) acordado à toa. Cada consulta acorda o
// compute do Neon, e ele só volta a dormir depois de alguns minutos sem nenhuma
// — então uma única aba esquecida aberta (TV do telão, tablet do quiosque,
// dashboard do gestor) consultando a cada 3s mantinha o banco ligado 24h e
// gerava cobrança. Aqui o polling:
// - para enquanto a aba está oculta (outra aba, tela do celular bloqueada,
//   janela minimizada) e atualiza na hora quando ela volta a aparecer;
// - pausa quando a tela fica "parada": ninguém interage E o resultado da
//   consulta não muda por `pausarAposMs`. Durante um evento a fila/telão muda o
//   tempo todo, então isso só pega a tela esquecida depois que tudo acabou.
//   Qualquer toque/tecla retoma (e atualiza na hora).
//
// `carregar` pode devolver os dados carregados: eles são comparados entre uma
// rodada e outra pra saber se algo mudou. Se não devolver nada, só a
// interação do usuário conta como atividade.
const EVENTOS_INTERACAO = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function usePollingEconomico(
  carregar: () => Promise<unknown> | unknown,
  intervaloMs: number,
  { pausarAposMs = 30 * 60 * 1000 }: { pausarAposMs?: number } = {},
) {
  const [pausado, setPausado] = useState(false);
  const ultimaAtividadeRef = useRef(Date.now());
  const ultimaAssinaturaRef = useRef<string | undefined>(undefined);
  const pausadoRef = useRef(false);
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  const rodar = useCallback(async () => {
    const dados = await carregarRef.current();
    if (dados === undefined || dados === null) return;
    let assinatura: string | undefined;
    try {
      assinatura = JSON.stringify(dados);
    } catch {
      return;
    }
    if (assinatura !== ultimaAssinaturaRef.current) {
      ultimaAssinaturaRef.current = assinatura;
      ultimaAtividadeRef.current = Date.now();
    }
  }, []);

  const retomar = useCallback(() => {
    ultimaAtividadeRef.current = Date.now();
    if (pausadoRef.current) {
      pausadoRef.current = false;
      setPausado(false);
    }
  }, []);

  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | null = null;

    const parar = () => {
      if (intervalo) clearInterval(intervalo);
      intervalo = null;
    };

    const tick = () => {
      if (Date.now() - ultimaAtividadeRef.current >= pausarAposMs) {
        pausadoRef.current = true;
        setPausado(true);
        parar();
        return;
      }
      rodar();
    };

    const iniciar = () => {
      if (intervalo || pausadoRef.current || document.visibilityState !== "visible") return;
      rodar();
      intervalo = setInterval(tick, intervaloMs);
    };

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") iniciar();
      else parar();
    };

    // se estava pausado, retomar() muda `pausado` e este efeito roda de novo,
    // reiniciando o polling (com uma atualização imediata)
    const aoInteragir = () => retomar();

    iniciar();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    for (const ev of EVENTOS_INTERACAO) window.addEventListener(ev, aoInteragir, { passive: true });
    return () => {
      parar();
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      for (const ev of EVENTOS_INTERACAO) window.removeEventListener(ev, aoInteragir);
    };
  }, [intervaloMs, pausarAposMs, rodar, retomar, pausado]);

  return { pausado, retomar };
}
