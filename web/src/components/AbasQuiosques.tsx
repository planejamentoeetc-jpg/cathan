"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ModalidadeQuiosque } from "@prisma/client";
import { IconeModalidade } from "./IconeModalidade";

type Irmao = {
  id: string;
  nome: string;
  cor: string;
  modalidade: ModalidadeQuiosque;
  logoUrl: string | null;
};

// Fileira de troca rápida entre os quiosques-irmãos do mesmo evento, na tela
// da loja. Vira componente próprio (client) só por causa dos botões de
// rolar/indicador de posição -- precisam saber a posição real do scroll,
// algo que um componente de servidor não tem como calcular.
export function AbasQuiosques({
  eventoId,
  irmaos,
  atualId,
}: {
  eventoId: string;
  irmaos: Irmao[];
  atualId: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [temMaisEsquerda, setTemMaisEsquerda] = useState(false);
  const [temMaisDireita, setTemMaisDireita] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function atualizar() {
      if (!el) return;
      // margem folgada (não só pra arredondamento de subpixel): o scroll-snap
      // do container costuma "descansar" uns ~16px à frente do zero real
      // (alinhando com o padding), então uma margem pequena piscava a seta
      // esquerda logo na carga inicial, sem o usuário ter rolado nada ainda
      setTemMaisEsquerda(el.scrollLeft > 20);
      setTemMaisDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 20);
    }

    atualizar();
    el.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      el.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, [irmaos]);

  // rola pouco mais que a largura de um cartão -- avança uma "página" visível
  // por clique, sem pular direto pro fim. "instant", não "smooth": o
  // scroll-snap do container briga com a animação do "smooth" e cancela o
  // scroll de volta pro ponto de partida em vez de animar (reproduzível,
  // não é só flakiness do ambiente de teste).
  function rolar(direcao: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direcao * 220, behavior: "instant" });
  }

  return (
    <div className="quiosques-abas-wrap">
      {temMaisEsquerda && (
        <button
          type="button"
          className="quiosques-abas-seta quiosques-abas-seta-esq"
          onClick={() => rolar(-1)}
          aria-label="Ver quiosques anteriores"
        >
          ‹
        </button>
      )}

      <div className="quiosques-abas" ref={scrollRef}>
        {irmaos.map((irmao) => (
          <Link
            key={irmao.id}
            href={`/e/${eventoId}/q/${irmao.id}`}
            className="quiosque-aba"
            style={irmao.id === atualId ? { borderColor: irmao.cor, borderWidth: 2 } : undefined}
          >
            <div className="quiosque-logo" style={{ background: irmao.logoUrl ? undefined : irmao.cor }}>
              {irmao.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={irmao.logoUrl} alt={irmao.nome} />
              ) : (
                <IconeModalidade modalidade={irmao.modalidade} />
              )}
            </div>
            <b>{irmao.nome}</b>
          </Link>
        ))}
      </div>

      {temMaisDireita && (
        <button
          type="button"
          className="quiosques-abas-seta quiosques-abas-seta-dir"
          onClick={() => rolar(1)}
          aria-label="Ver mais quiosques"
        >
          ›
        </button>
      )}
    </div>
  );
}
