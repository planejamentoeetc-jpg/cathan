"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { agruparPorQuiosque, calcularTotal, limparCarrinho, useCarrinho } from "@/lib/cart";
import { lerClienteLocal, salvarClienteLocal } from "@/lib/clienteLocal";
import { lerPixPendente, limparPixPendente, salvarPixPendente, type PixPendenteLocal } from "@/lib/pixPendente";
import { MapaForaDoRaio } from "@/components/MapaForaDoRaio";

const MAX_TENTATIVAS_POLLING = 30;
const INTERVALO_POLLING_MS = 2000;

function formatarDistancia(metros: number) {
  if (metros >= 1000) {
    return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  }
  return `${metros} m`;
}

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type DadosPix = PixPendenteLocal;

export function CheckoutForm({
  eventoId,
  exigeLocalizacao,
  pedidosPausados = false,
}: {
  eventoId: string;
  exigeLocalizacao: boolean;
  pedidosPausados?: boolean;
}) {
  const itens = useCarrinho(eventoId);
  const grupos = agruparPorQuiosque(itens);
  const total = calcularTotal(itens);

  const clienteSalvo = lerClienteLocal();
  const [nome, setNome] = useState(clienteSalvo?.nome ?? "");
  const [celular, setCelular] = useState(clienteSalvo?.celular ?? "");
  // um nome por unidade, por produto (índice 0..quantidade-1)
  const [nomesCriancasPorProduto, setNomesCriancasPorProduto] = useState<Record<string, string[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [foraDoRaio, setForaDoRaio] = useState<{ distancia: number; raio: number } | null>(null);

  // restaura um Pix em andamento (ex.: a aba recarregou enquanto o cliente estava
  // no app do banco pagando) em vez de sempre começar do formulário em branco
  const [pix, setPix] = useState<DadosPix | null>(() => lerPixPendente(eventoId));
  const [copiado, setCopiado] = useState(false);
  const [tentativasEsgotadas, setTentativasEsgotadas] = useState(false);
  const [pedidoConfirmadoId, setPedidoConfirmadoId] = useState<string | null>(
    () => lerPixPendente(eventoId)?.pedidoId ?? null
  );
  const tentativasRef = useRef(0);

  useEffect(() => {
    if (!pix || pedidoConfirmadoId) return;

    let cancelado = false;
    async function verificar() {
      try {
        const resposta = await fetch(`/api/pedidos-pendentes/${pix!.pedidoPendenteId}`, {
          cache: "no-store",
        });
        if (!resposta.ok || cancelado) return;
        const dados = await resposta.json();
        if (dados.status === "CONFIRMADO" && dados.pedidoId) {
          clearInterval(intervalo);
          salvarPixPendente(eventoId, { ...pix!, pedidoId: dados.pedidoId });
          setPedidoConfirmadoId(dados.pedidoId);
        }
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }

    verificar();
    const intervalo = setInterval(() => {
      tentativasRef.current += 1;
      if (tentativasRef.current >= MAX_TENTATIVAS_POLLING) {
        clearInterval(intervalo);
        setTentativasEsgotadas(true);
        return;
      }
      verificar();
    }, INTERVALO_POLLING_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [pix, pedidoConfirmadoId]);

  function nomeCrianca(produtoId: string, indice: number) {
    return nomesCriancasPorProduto[produtoId]?.[indice] ?? "";
  }

  function definirNomeCrianca(produtoId: string, indice: number, valor: string) {
    setNomesCriancasPorProduto((atual) => {
      const lista = [...(atual[produtoId] ?? [])];
      lista[indice] = valor;
      return { ...atual, [produtoId]: lista };
    });
  }

  function pedirLocalizacao(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Este navegador não suporta localização."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (posicao) =>
          resolve({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude }),
        () =>
          reject(
            new Error(
              "Não foi possível obter sua localização. Permita o acesso e tente novamente."
            )
          ),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function confirmar() {
    setErro(null);
    setForaDoRaio(null);

    if (!nome.trim() || !celular.trim()) {
      setErro("Informe nome e celular para continuar.");
      return;
    }
    if (itens.length === 0) {
      setErro("Seu carrinho está vazio.");
      return;
    }

    setEnviando(true);
    try {
      let localizacao: { latitude: number; longitude: number } | null = null;
      if (exigeLocalizacao) {
        localizacao = await pedirLocalizacao();
      }

      const resposta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          clienteNome: nome.trim(),
          clienteCelular: celular.trim(),
          latitude: localizacao?.latitude,
          longitude: localizacao?.longitude,
          itens: itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            observacao: i.observacao,
            nomesCriancas:
              i.quiosqueModalidade === "BRINCADEIRAS"
                ? (nomesCriancasPorProduto[i.produtoId] ?? []).map((n) => n.trim()).filter(Boolean)
                : undefined,
          })),
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        if (typeof dados.distanciaMetros === "number") {
          setForaDoRaio({ distancia: dados.distanciaMetros, raio: dados.raioPedidosMetros });
        } else {
          setErro(dados.erro ?? "Não foi possível concluir o pedido.");
        }
        setEnviando(false);
        return;
      }

      salvarClienteLocal({ nome: nome.trim(), celular: celular.trim() });
      const novoPix = { pedidoPendenteId: dados.pedidoPendenteId, valor: total, criadoEm: Date.now(), ...dados.pix };
      salvarPixPendente(eventoId, novoPix);
      setPix(novoPix);
      limparCarrinho(eventoId);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarCodigo() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // navegador sem permissão de clipboard — cliente copia manualmente do texto exibido
    }
  }

  if (pedidoConfirmadoId) {
    return (
      <div className="cartao" style={{ textAlign: "center", padding: "32px 20px" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--verde-suave)",
            color: "var(--verde)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            margin: "0 auto 16px",
          }}
        >
          ✓
        </div>
        <b style={{ fontFamily: "var(--font-sora)", fontSize: 18, display: "block", marginBottom: 6 }}>
          Pagamento confirmado!
        </b>
        <p className="texto-fraco" style={{ marginBottom: 22 }}>
          Seu pedido já foi enviado para o(s) quiosque(s). Acompanhe o preparo e o código de
          retirada na tela de pedidos.
        </p>
        <Link
          href={`/e/${eventoId}/pedido/${pedidoConfirmadoId}`}
          className="btn btn-primario btn-bloco"
          onClick={() => limparPixPendente(eventoId)}
        >
          Ver meu pedido
        </Link>
      </div>
    );
  }

  if (pix) {
    return (
      <div className="cartao" style={{ textAlign: "center" }}>
        <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 4 }}>
          Pague com Pix · {formatarReais(pix.valor)}
        </b>
        <p className="texto-fraco" style={{ marginBottom: 16 }}>
          Escaneie o QR code no app do seu banco, ou copie o código abaixo.
        </p>

        <img
          src={`data:image/png;base64,${pix.qrCodeBase64}`}
          alt="QR code do Pix"
          style={{ width: 220, height: 220, margin: "0 auto 16px", borderRadius: 12 }}
        />

        <textarea
          readOnly
          value={pix.copiaECola}
          onFocus={(e) => e.target.select()}
          rows={3}
          style={{
            width: "100%",
            border: "1.5px solid var(--linha)",
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 11.5,
            fontFamily: "var(--font-mono)",
            background: "var(--neve)",
            resize: "none",
            marginBottom: 10,
          }}
        />

        <button type="button" className="btn btn-secundario btn-bloco" onClick={copiarCodigo} style={{ marginBottom: 16 }}>
          {copiado ? "Copiado ✓" : "Copiar código Pix"}
        </button>

        {!tentativasEsgotadas ? (
          <p className="texto-fraco">Aguardando confirmação do pagamento…</p>
        ) : (
          <>
            <p className="texto-fraco" style={{ marginBottom: 10 }}>
              O pagamento ainda está sendo processado. Você pode fechar esta tela — assim que for
              confirmado, seu pedido aparece pronto para acompanhamento.
            </p>
            <button
              type="button"
              className="btn btn-secundario btn-bloco"
              style={{ marginBottom: 10 }}
              onClick={() => {
                tentativasRef.current = 0;
                setTentativasEsgotadas(false);
              }}
            >
              Verificar novamente
            </button>
          </>
        )}

        <button
          type="button"
          className="texto-fraco"
          style={{ marginTop: 10, textDecoration: "underline" }}
          onClick={() => {
            limparPixPendente(eventoId);
            setPix(null);
            setPedidoConfirmadoId(null);
            setTentativasEsgotadas(false);
            tentativasRef.current = 0;
          }}
        >
          Não é isso que eu quero pagar — cancelar e fazer um novo pedido
        </button>
      </div>
    );
  }

  if (foraDoRaio) {
    return (
      <>
        <MapaForaDoRaio distanciaMetros={foraDoRaio.distancia} raioMetros={foraDoRaio.raio} />
        <div className="cartao">
          <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 6 }}>
            Você está a {formatarDistancia(foraDoRaio.distancia)} do evento
          </b>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            Indo para lá? Pode deixar o carrinho pronto — assim que você entrar na área
            sombreada, é só tentar pagar de novo.
          </p>
          <Link href={`/e/${eventoId}`} className="btn btn-secundario btn-bloco">
            Voltar ao cardápio
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="cartao" style={{ marginBottom: 14 }}>
        {grupos.map((grupo) => (
          <div key={grupo[0].quiosqueId} style={{ marginBottom: 14 }}>
            <b style={{ color: grupo[0].quiosqueCor, fontFamily: "var(--font-sora)" }}>
              {grupo[0].quiosqueNome}
            </b>
            {grupo.map((item) => (
              <div key={item.produtoId} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span>
                    {item.quantidade}× {item.nome}
                  </span>
                  <span>{formatarReais(item.preco * item.quantidade)}</span>
                </div>

                {item.quiosqueModalidade === "BRINCADEIRAS" && (
                  <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                    {Array.from({ length: item.quantidade }).map((_, indice) => (
                      <input
                        key={indice}
                        type="text"
                        value={nomeCrianca(item.produtoId, indice)}
                        onChange={(e) => definirNomeCrianca(item.produtoId, indice, e.target.value)}
                        placeholder={
                          item.quantidade > 1
                            ? `Primeiro nome da criança ${indice + 1}`
                            : "Primeiro nome da criança"
                        }
                        style={{
                          border: "1.5px solid var(--linha)",
                          borderRadius: 8,
                          padding: "6px 8px",
                          fontSize: 12.5,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
          <span>Total</span>
          <span>{formatarReais(total)}</span>
        </div>
      </div>

      <div className="cartao">
        <div className="campo">
          <label>Nome</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label>Celular</label>
          <input
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
        {exigeLocalizacao && (
          <p className="texto-fraco" style={{ marginBottom: 10 }}>
            Este evento exige que você esteja dentro do raio de pedidos. Vamos pedir sua
            localização ao confirmar.
          </p>
        )}

        {erro && (
          <div className="aviso" style={{ marginBottom: 10 }}>
            {erro}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primario btn-bloco"
          disabled={enviando || itens.length === 0 || pedidosPausados}
          onClick={confirmar}
        >
          {pedidosPausados
            ? "Pedidos pausados"
            : enviando
            ? "Gerando Pix…"
            : `Pagar com Pix · ${formatarReais(total)}`}
        </button>
      </div>
    </>
  );
}
