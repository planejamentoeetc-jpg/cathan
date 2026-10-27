"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { Cronometro } from "@/components/Cronometro";
import { MarcaCathan } from "@/components/MarcaCathan";
import { usePollingEconomico } from "@/lib/usePollingEconomico";
import { AvisoPollingPausado } from "@/components/AvisoPollingPausado";

const INTERVALO_POLLING_MS = 3000;

type StatusTelao = "RECEBIDO" | "ACEITO" | "PRONTO" | "CHAMADO" | "APROVEITANDO";

type PedidoTelao = {
  id: string;
  status: StatusTelao;
  codigoRetirada: string;
  rodada: number;
  clienteNome: string;
  nomesCriancas: string[];
  duracaoMinutos: number;
  inicioAproveitamentoEm: string | null;
};

type QuiosqueTelao = {
  id: string;
  nome: string;
  cor: string;
  modalidade: "ALIMENTACAO" | "BEBIDAS" | "BRINCADEIRAS";
  pedidos: PedidoTelao[];
};

type Entrada = PedidoTelao & { nomeExibido: string; quiosqueNome: string; quiosqueCor: string };

// Tela pública: só primeiro nome + inicial do sobrenome ("WELLINGTON S"),
// como nos telões de fast-food -- o cliente se reconhece sem expor o nome todo.
function nomeCurto(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const primeiro = partes[0];
  return partes.length > 1 ? `${primeiro} ${partes[partes.length - 1][0]}` : primeiro;
}

// pronto pulsa até o cliente retirar (aí some da lista) -- chama o olho de longe
function Nome({ e, pulsando = false, mostrarQuiosque }: { e: Entrada; pulsando?: boolean; mostrarQuiosque: boolean }) {
  return (
    <li className={pulsando ? "telao2-nome telao2-nome-pulsando" : "telao2-nome"}>
      <span className="telao2-nome-texto">
        {e.nomeExibido}
        {e.rodada > 1 && <small> · {e.rodada}ª</small>}
      </span>
      <span className="telao2-detalhe">
        {mostrarQuiosque && (
          <span className="telao2-quiosque" style={{ "--cor-quiosque": e.quiosqueCor } as CSSProperties}>
            {e.quiosqueNome}
          </span>
        )}
        <span className="telao2-codigo">{e.codigoRetirada}</span>
      </span>
    </li>
  );
}

export function TelaoPedidos({
  eventoId,
  eventoNome,
  qrCodeDataUrl,
}: {
  eventoId: string;
  eventoNome: string;
  qrCodeDataUrl: string;
}) {
  const [quiosques, setQuiosques] = useState<QuiosqueTelao[]>([]);
  // quando cada pedido foi visto pronto pela primeira vez nesta tela
  const vistoProntoEmRef = useRef(new Map<string, number>());

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/tela-de-pedidos`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      setQuiosques(dados.quiosques);
      return dados;
    } catch {
      // silencioso: a próxima rodada de polling tenta de novo
    }
  }, [eventoId]);

  const { pausado, retomar } = usePollingEconomico(carregar, INTERVALO_POLLING_MS);

  const variosQuiosques = quiosques.length > 1;
  const entradas: Entrada[] = quiosques.flatMap((q) =>
    q.pedidos.map((p) => ({
      ...p,
      nomeExibido: nomeCurto(q.modalidade === "BRINCADEIRAS" ? p.nomesCriancas[0] ?? p.clienteNome : p.clienteNome),
      quiosqueNome: q.nome,
      quiosqueCor: q.cor,
    }))
  );

  const preparando = entradas.filter((e) => e.status === "RECEBIDO" || e.status === "ACEITO");
  const brincando = entradas.filter((e) => e.status === "APROVEITANDO");
  const agora = Date.now();
  const vistos = vistoProntoEmRef.current;
  const prontos = entradas
    .filter((e) => e.status === "PRONTO" || e.status === "CHAMADO")
    .map((e) => {
      if (!vistos.has(e.id)) vistos.set(e.id, agora);
      return { ...e, vistoEm: vistos.get(e.id)! };
    })
    // o que ficou pronto por último aparece primeiro
    .sort((a, b) => b.vistoEm - a.vistoEm);

  return (
    <div className="telao2">
      <AvisoPollingPausado pausado={pausado} onRetomar={retomar} />

      <section className="telao2-preparando">
        <h1>Preparando</h1>
        {preparando.length === 0 ? (
          <p className="telao2-vazio">Nenhum pedido em preparo agora</p>
        ) : (
          <ul className="telao2-lista">
            {preparando.map((e) => (
              <Nome key={e.id} e={e} mostrarQuiosque={variosQuiosques} />
            ))}
          </ul>
        )}

        {brincando.length > 0 && (
          <div className="telao2-brincando">
            <h2>Brincando agora</h2>
            <ul>
              {brincando.map((e) => (
                <li key={e.id}>
                  <b>{e.nomeExibido}</b>
                  {e.inicioAproveitamentoEm && (
                    <Cronometro inicioEm={e.inicioAproveitamentoEm} duracaoMinutos={e.duracaoMinutos} className="mono" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="telao2-prontos">
        <h1>Prontos</h1>
        {prontos.length === 0 ? (
          <p className="telao2-vazio">Assim que ficar pronto, seu nome aparece aqui</p>
        ) : (
          <ul className="telao2-lista">
            {prontos.map((e) => (
              <Nome key={e.id} e={e} pulsando mostrarQuiosque={variosQuiosques} />
            ))}
          </ul>
        )}
      </section>

      <footer className="telao2-faixa">
        <div className="telao2-faixa-texto">
          <b>Peça pelo celular, sem fila!</b>
          <span>Aponte a câmera para o QR Code · {eventoNome}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="telao2-qr" src={qrCodeDataUrl} alt="QR Code para fazer pedido pelo celular" />
        <div className="telao2-marca">
          <MarcaCathan variante="negativa" largura={150} />
        </div>
      </footer>
    </div>
  );
}
