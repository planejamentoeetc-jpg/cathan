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
// da loja. Vira componente próprio (client) só por causa do indicador de
// "tem mais pra rolar" -- precisa saber a posição real do scroll, algo que
// um componente de servidor não tem como calcular.
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
  const [temMaisDireita, setTemMaisDireita] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function atualizar() {
      if (!el) return;
      // margem de 4px pra não piscar por causa de arredondamento de subpixel
      setTemMaisDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    atualizar();
    el.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      el.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, [irmaos]);

  return (
    <div className="quiosques-abas-wrap">
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
        <>
          <div className="quiosques-abas-fade" aria-hidden />
          <div className="quiosques-abas-seta" aria-hidden>
            ›
          </div>
        </>
      )}
    </div>
  );
}
