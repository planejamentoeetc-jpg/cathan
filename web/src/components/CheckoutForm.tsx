"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { agruparPorQuiosque, calcularTotal, limparCarrinho, useCarrinho } from "@/lib/cart";
import { lerClienteLocal, salvarClienteLocal } from "@/lib/clienteLocal";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CheckoutForm({
  eventoId,
  exigeLocalizacao,
}: {
  eventoId: string;
  exigeLocalizacao: boolean;
}) {
  const router = useRouter();
  const itens = useCarrinho(eventoId);
  const grupos = agruparPorQuiosque(itens);

  const clienteSalvo = lerClienteLocal();
  const [nome, setNome] = useState(clienteSalvo?.nome ?? "");
  const [celular, setCelular] = useState(clienteSalvo?.celular ?? "");
  // um nome por unidade, por produto (índice 0..quantidade-1)
  const [nomesCriancasPorProduto, setNomesCriancasPorProduto] = useState<Record<string, string[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
        setErro(
          dados.distanciaMetros
            ? `${dados.erro} (você está a ${dados.distanciaMetros}m; raio permitido: ${dados.raioPedidosMetros}m)`
            : dados.erro ?? "Não foi possível concluir o pedido."
        );
        setEnviando(false);
        return;
      }

      salvarClienteLocal({ nome: nome.trim(), celular: celular.trim() });
      limparCarrinho(eventoId);
      router.push(`/e/${eventoId}/pedido/${dados.pedidoId}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setEnviando(false);
    }
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
          <span>{formatarReais(calcularTotal(itens))}</span>
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
          disabled={enviando || itens.length === 0}
          onClick={confirmar}
        >
          {enviando ? "Confirmando…" : "Confirmar pedido (pagamento simulado)"}
        </button>
      </div>
    </>
  );
}
