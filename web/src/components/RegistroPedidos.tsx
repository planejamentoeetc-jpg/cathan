"use client";

import { useMemo, useState } from "react";
import { STATUS_LABEL } from "@/lib/statusSubPedido";

type ItemRegistro = {
  id: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  observacao: string | null;
  nomesCriancas: string[];
  liberadoParaProducao: boolean;
};

type SubPedidoRegistro = {
  id: string;
  status: keyof typeof STATUS_LABEL;
  codigoRetirada: string;
  quiosqueNome: string;
  quiosqueCor: string;
  criadoEm: string;
  aceitoEm: string | null;
  prontoEm: string | null;
  retiradoEm: string | null;
  chamadoEm: string | null;
  concluidoEm: string | null;
  itens: ItemRegistro[];
};

export type PedidoRegistro = {
  id: string;
  criadoEm: string;
  clienteNome: string;
  clienteCelular: string;
  formaPagamento: "MERCADO_PAGO" | "DINHEIRO";
  subPedidos: SubPedidoRegistro[];
};

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function valorTotalPedido(pedido: PedidoRegistro) {
  return pedido.subPedidos.reduce(
    (soma, sp) => soma + sp.itens.reduce((s, item) => s + item.precoUnitario * item.quantidade, 0),
    0
  );
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function bate(pedido: PedidoRegistro, buscaNormalizada: string) {
  if (!buscaNormalizada) return true;
  if (normalizar(pedido.clienteNome).includes(buscaNormalizada)) return true;
  const digitosBusca = buscaNormalizada.replace(/\D/g, "");
  if (digitosBusca && pedido.clienteCelular.replace(/\D/g, "").includes(digitosBusca)) return true;
  return pedido.subPedidos.some(
    (sp) =>
      normalizar(sp.codigoRetirada).includes(buscaNormalizada) ||
      sp.itens.some((item) => item.nomesCriancas.some((nome) => normalizar(nome).includes(buscaNormalizada)))
  );
}

const TIMESTAMP_ROTULO: { chave: keyof SubPedidoRegistro; rotulo: string }[] = [
  { chave: "aceitoEm", rotulo: "Aceito" },
  { chave: "prontoEm", rotulo: "Pronto" },
  { chave: "chamadoEm", rotulo: "Chamado" },
  { chave: "concluidoEm", rotulo: "Concluído" },
  { chave: "retiradoEm", rotulo: "Retirado" },
];

export function RegistroPedidos({ pedidos }: { pedidos: PedidoRegistro[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const buscaNormalizada = normalizar(busca.trim());
    return pedidos.filter((p) => bate(p, buscaNormalizada));
  }, [pedidos, busca]);

  return (
    <div>
      <div className="campo" style={{ marginBottom: 16 }}>
        <label>Buscar por código de retirada, nome (cliente ou criança) ou celular</label>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: L4GS, Ana, ou (22) 98119-4639"
          autoFocus
        />
      </div>

      <p className="texto-fraco" style={{ marginBottom: 12 }}>
        {filtrados.length} de {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"}
      </p>

      <div className="lista">
        {filtrados.map((pedido) => (
          <div key={pedido.id} className="cartao">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <b style={{ fontFamily: "var(--font-sora)" }}>{pedido.clienteNome}</b>
                <div className="texto-fraco" style={{ fontSize: 12.5 }}>
                  {pedido.clienteCelular} · {formatarDataHora(pedido.criadoEm)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>{formatarReais(valorTotalPedido(pedido))}</div>
                <span
                  className="badge-status"
                  style={
                    pedido.formaPagamento === "DINHEIRO"
                      ? { background: "var(--pipoca-suave)", color: "#a06c1a" }
                      : undefined
                  }
                >
                  {pedido.formaPagamento === "DINHEIRO" ? "Dinheiro (caixa)" : "Mercado Pago"}
                </span>
              </div>
            </div>

            {pedido.subPedidos.map((sp) => (
              <div
                key={sp.id}
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--linha)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ color: sp.quiosqueCor, fontSize: 13.5 }}>{sp.quiosqueNome}</b>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono texto-fraco" style={{ fontSize: 12 }}>
                      {sp.codigoRetirada}
                    </span>
                    <span className="badge-status">{STATUS_LABEL[sp.status]}</span>
                  </div>
                </div>

                <div style={{ marginTop: 6 }}>
                  {sp.itens.map((item) => (
                    <div key={item.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span>
                        {item.quantidade}× {item.nome}
                        {item.observacao && <span className="texto-fraco"> — {item.observacao}</span>}
                        {item.nomesCriancas.length > 0 && (
                          <span className="texto-fraco"> ({item.nomesCriancas.join(", ")})</span>
                        )}
                        {!item.liberadoParaProducao && (
                          <span className="texto-fraco" style={{ fontStyle: "italic" }}> · segurado</span>
                        )}
                      </span>
                      <span className="texto-fraco">{formatarReais(item.precoUnitario * item.quantidade)}</span>
                    </div>
                  ))}
                </div>

                <div className="texto-fraco" style={{ fontSize: 11.5, marginTop: 6 }}>
                  {TIMESTAMP_ROTULO.filter((t) => sp[t.chave]).length > 0
                    ? TIMESTAMP_ROTULO.filter((t) => sp[t.chave])
                        .map((t) => `${t.rotulo} ${formatarDataHora(sp[t.chave] as string)}`)
                        .join(" · ")
                    : "Ainda sem nenhuma etapa registrada"}
                </div>
              </div>
            ))}
          </div>
        ))}

        {filtrados.length === 0 && (
          <p className="texto-fraco">Nenhum pedido encontrado com esse termo de busca.</p>
        )}
      </div>
    </div>
  );
}
