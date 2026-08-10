"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ModalidadeQuiosque, TipoQuiosque } from "@prisma/client";

const MODALIDADES: { valor: ModalidadeQuiosque; rotulo: string }[] = [
  { valor: "ALIMENTACAO", rotulo: "Alimentação" },
  { valor: "BEBIDAS", rotulo: "Bebidas" },
  { valor: "BRINCADEIRAS", rotulo: "Brincadeiras" },
];

export function CriarQuiosqueForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [modalidade, setModalidade] = useState<ModalidadeQuiosque>("ALIMENTACAO");
  const [tipo, setTipo] = useState<TipoQuiosque>("DO_EVENTO");
  const [cnpj, setCnpj] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    setErro(null);

    if (!nome.trim()) {
      setErro("Informe o nome do quiosque.");
      return;
    }
    if (tipo === "INDEPENDENTE" && (!cnpj.trim() || !chavePix.trim())) {
      setErro("Quiosque independente precisa de CNPJ/CPF e chave PIX de recebimento.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/quiosques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          modalidade,
          tipo,
          cnpj: tipo === "INDEPENDENTE" ? cnpj.trim() : undefined,
          chavePix: tipo === "INDEPENDENTE" ? chavePix.trim() : undefined,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível criar o quiosque.");
        setEnviando(false);
        return;
      }

      router.push(`/gestor/eventos/${eventoId}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <div className="campo">
        <label>Nome do quiosque</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>

      <div className="campo">
        <label>Modalidade</label>
        <select
          value={modalidade}
          onChange={(e) => setModalidade(e.target.value as ModalidadeQuiosque)}
          style={{
            border: "1.5px solid var(--linha)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          {MODALIDADES.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Modelo de recebimento</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoQuiosque)}
          style={{
            border: "1.5px solid var(--linha)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          <option value="DO_EVENTO">Do evento — recebe na conta do organizador</option>
          <option value="INDEPENDENTE">🏢 Independente — empresa própria, recebe direto</option>
        </select>
      </div>

      {tipo === "INDEPENDENTE" && (
        <>
          <div className="campo">
            <label>CNPJ / CPF do lojista</label>
            <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="campo">
            <label>Chave PIX de recebimento</label>
            <input
              type="text"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="chave@pix.com"
            />
          </div>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            Isso já fica registrado, mas o repasse automático (split) ainda não está ativo — hoje
            todo pagamento cai numa conta única, independente do modelo de recebimento.
          </p>
        </>
      )}

      <p className="texto-fraco" style={{ marginBottom: 14 }}>
        Você poderá cadastrar os produtos deste quiosque depois.
      </p>

      {erro && (
        <div className="aviso" style={{ marginBottom: 10 }}>
          {erro}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primario btn-bloco"
        disabled={enviando}
        onClick={criar}
      >
        {enviando ? "Criando…" : "Criar quiosque"}
      </button>
    </div>
  );
}
