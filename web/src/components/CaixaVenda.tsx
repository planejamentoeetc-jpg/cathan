"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUS_LABEL } from "@/lib/statusSubPedido";

type Produto = { id: string; nome: string; preco: number };
type Quiosque = {
  id: string;
  nome: string;
  cor: string;
  modalidade: "ALIMENTACAO" | "BEBIDAS" | "BRINCADEIRAS";
  produtos: Produto[];
};

type ItemCarrinho = {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  quiosqueId: string;
  quiosqueNome: string;
  quiosqueCor: string;
  brincadeira: boolean;
  nomesCriancas: string[];
};

type VendaHistorico = {
  id: string;
  criadoEm: string;
  clienteNome: string;
  subPedidos: {
    id: string;
    codigoRetirada: string;
    status: keyof typeof STATUS_LABEL;
    quiosqueNome: string;
    quiosqueCor: string;
    itens: string[];
  }[];
};

const INTERVALO_POLLING_MS = 5000;

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CaixaVenda({
  eventoId,
  pausado,
  quiosques,
}: {
  eventoId: string;
  pausado: boolean;
  quiosques: Quiosque[];
}) {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaVenda, setUltimaVenda] = useState<string[] | null>(null);
  const [vendas, setVendas] = useState<VendaHistorico[]>([]);

  const carregarVendas = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/caixa/${eventoId}/vendas`, { cache: "no-store" });
      if (resposta.ok) setVendas(await resposta.json());
    } catch {
      // silencioso — a lista atualiza de novo no próximo ciclo de polling
    }
  }, [eventoId]);

  useEffect(() => {
    carregarVendas();
    const intervalo = setInterval(carregarVendas, INTERVALO_POLLING_MS);
    return () => clearInterval(intervalo);
  }, [carregarVendas]);

  function adicionar(quiosque: Quiosque, produto: Produto) {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.produtoId === produto.id);
      if (existente) {
        return atual.map((i) =>
          i.produtoId === produto.id
            ? {
                ...i,
                quantidade: i.quantidade + 1,
                nomesCriancas: [...i.nomesCriancas, ""],
              }
            : i
        );
      }
      return [
        ...atual,
        {
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          quiosqueId: quiosque.id,
          quiosqueNome: quiosque.nome,
          quiosqueCor: quiosque.cor,
          brincadeira: quiosque.modalidade === "BRINCADEIRAS",
          nomesCriancas: [""],
        },
      ];
    });
  }

  function alterarQtd(produtoId: string, delta: number) {
    setCarrinho((atual) => {
      const item = atual.find((i) => i.produtoId === produtoId);
      if (!item) return atual;
      const novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) return atual.filter((i) => i.produtoId !== produtoId);
      return atual.map((i) =>
        i.produtoId === produtoId
          ? {
              ...i,
              quantidade: novaQtd,
              nomesCriancas:
                delta > 0 ? [...i.nomesCriancas, ""] : i.nomesCriancas.slice(0, novaQtd),
            }
          : i
      );
    });
  }

  function definirNomeCrianca(produtoId: string, indice: number, valor: string) {
    setCarrinho((atual) =>
      atual.map((i) => {
        if (i.produtoId !== produtoId) return i;
        const nomes = [...i.nomesCriancas];
        nomes[indice] = valor;
        return { ...i, nomesCriancas: nomes };
      })
    );
  }

  const total = carrinho.reduce((soma, i) => soma + i.preco * i.quantidade, 0);

  async function finalizarVenda() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    if (carrinho.length === 0) {
      setErro("Adicione pelo menos um item.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/caixa/${eventoId}/vender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: nome.trim(),
          clienteCelular: celular.trim() || undefined,
          itens: carrinho.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            nomesCriancas: i.brincadeira
              ? i.nomesCriancas.map((n) => n.trim()).filter(Boolean)
              : undefined,
          })),
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível registrar a venda.");
        setEnviando(false);
        return;
      }

      setUltimaVenda(dados.subPedidos.map((sp: { codigoRetirada: string }) => sp.codigoRetirada));
      setCarrinho([]);
      setNome("");
      setCelular("");
      carregarVendas();
    } catch {
      setErro("Erro inesperado ao registrar a venda.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {ultimaVenda && (
        <div className="aviso" style={{ marginBottom: 16, borderColor: "var(--verde)", background: "var(--verde-suave)", color: "var(--verde)" }}>
          ✓ Venda registrada! Código{ultimaVenda.length > 1 ? "s" : ""}:{" "}
          <b className="mono">{ultimaVenda.join(", ")}</b>
        </div>
      )}

      <div className="painel-split">
        <div>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
            Catálogo do evento — toque para adicionar (pode misturar quiosques)
          </h5>
          {quiosques.map((quiosque) => (
            <div key={quiosque.id} style={{ marginBottom: 16 }}>
              <b style={{ color: quiosque.cor, fontFamily: "var(--font-sora)", fontSize: 13.5 }}>
                {quiosque.nome}
              </b>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                {quiosque.produtos.map((produto) => (
                  <button
                    key={produto.id}
                    type="button"
                    className="cartao"
                    style={{ textAlign: "left", padding: "10px 12px" }}
                    onClick={() => adicionar(quiosque, produto)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{produto.nome}</div>
                    <div className="texto-fraco">{formatarReais(produto.preco)}</div>
                  </button>
                ))}
              </div>
              {quiosque.produtos.length === 0 && (
                <p className="texto-fraco" style={{ marginTop: 6 }}>
                  Sem produtos ativos.
                </p>
              )}
            </div>
          ))}
        </div>

        <div>
          <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>Pedido atual</h5>

          {carrinho.length === 0 ? (
            <p className="texto-fraco">Toque nos produtos ao lado pra começar.</p>
          ) : (
            <div className="cartao" style={{ marginBottom: 14 }}>
              {carrinho.map((item) => (
                <div key={item.produtoId} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13.5 }}>
                      {item.nome}
                      <br />
                      <span className="texto-fraco">{item.quiosqueNome}</span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" className="btn btn-secundario" onClick={() => alterarQtd(item.produtoId, -1)}>
                        −
                      </button>
                      <span className="mono">{item.quantidade}</span>
                      <button type="button" className="btn btn-secundario" onClick={() => alterarQtd(item.produtoId, 1)}>
                        +
                      </button>
                    </div>
                  </div>

                  {item.brincadeira && (
                    <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                      {Array.from({ length: item.quantidade }).map((_, indice) => (
                        <input
                          key={indice}
                          type="text"
                          value={item.nomesCriancas[indice] ?? ""}
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

              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, borderTop: "1px solid var(--linha)", paddingTop: 10 }}>
                <span>Total</span>
                <span>{formatarReais(total)}</span>
              </div>
            </div>
          )}

          <div className="cartao">
            <div className="campo">
              <label>Nome do cliente</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="campo">
              <label>Celular (opcional)</label>
              <input type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="(00) 00000-0000" />
            </div>

            {erro && (
              <div className="aviso" style={{ marginBottom: 10 }}>
                {erro}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primario btn-bloco"
              disabled={enviando || pausado || carrinho.length === 0}
              onClick={finalizarVenda}
            >
              {pausado ? "Pedidos pausados" : enviando ? "Registrando…" : `Finalizar venda · ${formatarReais(total)}`}
            </button>
          </div>
        </div>
      </div>

      <div className="g-sec" style={{ marginTop: 16 }}>
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
          Acompanhamento — vendas do Caixa
        </h5>
        {vendas.length === 0 ? (
          <p className="texto-fraco">Nenhuma venda manual ainda.</p>
        ) : (
          vendas.map((venda) => (
            <div key={venda.id} style={{ marginBottom: 10 }}>
              <div className="texto-fraco" style={{ fontSize: 12, marginBottom: 4 }}>
                {venda.clienteNome} ·{" "}
                {new Date(venda.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {venda.subPedidos.map((sp) => (
                <div key={sp.id} className="g-row">
                  <span className="mono" style={{ background: sp.quiosqueCor, color: "#fff", padding: "2px 9px", borderRadius: 7, fontSize: 12.5 }}>
                    {sp.codigoRetirada}
                  </span>
                  <span>
                    {sp.quiosqueNome} · {sp.itens.join(", ")}
                  </span>
                  <span className="val" style={{ fontSize: 12 }}>
                    {STATUS_LABEL[sp.status]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
