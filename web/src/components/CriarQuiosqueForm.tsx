"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ModalidadeQuiosque, TipoQuiosque } from "@prisma/client";

const MODALIDADES: { valor: ModalidadeQuiosque; rotulo: string }[] = [
  { valor: "ALIMENTACAO", rotulo: "Alimentação" },
  { valor: "BEBIDAS", rotulo: "Bebidas" },
  { valor: "BRINCADEIRAS", rotulo: "Brincadeiras" },
];

export function CriarQuiosqueForm({
  eventoId,
  modalidadeEvento = "ORGANIZADOR_UNICO",
}: {
  eventoId: string;
  // define só o PADRÃO do seletor abaixo -- evento MULTI_ESTABELECIMENTO ainda
  // pode ter quiosque DO_EVENTO e vice-versa, dá pra trocar livremente
  modalidadeEvento?: "ORGANIZADOR_UNICO" | "MULTI_ESTABELECIMENTO";
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [modalidade, setModalidade] = useState<ModalidadeQuiosque>("ALIMENTACAO");
  const [tipo, setTipo] = useState<TipoQuiosque>(
    modalidadeEvento === "MULTI_ESTABELECIMENTO" ? "INDEPENDENTE" : "DO_EVENTO"
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    setErro(null);

    if (!nome.trim()) {
      setErro("Informe o nome do quiosque.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/quiosques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), modalidade, tipo }),
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
        <p className="texto-fraco" style={{ marginBottom: 14 }}>
          Depois de criar, use a própria tela do quiosque pra cadastrar produtos, enviar a logo e
          conectar a conta Mercado Pago do restaurante — até conectar, ele fica invisível pro
          cliente (não aparece pra pedir), já que ainda não tem como receber o pagamento.
        </p>
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
