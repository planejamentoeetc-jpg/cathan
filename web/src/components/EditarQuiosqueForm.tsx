"use client";

import { useRouter } from "next/navigation";
import { CSSProperties, useState } from "react";
import type { ModalidadeQuiosque, TipoQuiosque } from "@prisma/client";

const MODALIDADES: { valor: ModalidadeQuiosque; rotulo: string }[] = [
  { valor: "ALIMENTACAO", rotulo: "Alimentação" },
  { valor: "BEBIDAS", rotulo: "Bebidas" },
  { valor: "BRINCADEIRAS", rotulo: "Brincadeiras" },
];

const estiloSelect: CSSProperties = {
  border: "1.5px solid var(--linha)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
};

export function EditarQuiosqueForm({
  eventoId,
  quiosqueId,
  nomeInicial,
  modalidadeInicial,
  tipoInicial,
  cnpjInicial,
  chavePixInicial,
  dicaInicial,
  mensagemPreparandoInicial,
  mensagemProntoInicial,
  combinaComIdInicial,
  outrosQuiosques,
}: {
  eventoId: string;
  quiosqueId: string;
  nomeInicial: string;
  modalidadeInicial: ModalidadeQuiosque;
  tipoInicial: TipoQuiosque;
  cnpjInicial: string;
  chavePixInicial: string;
  dicaInicial: string;
  mensagemPreparandoInicial: string;
  mensagemProntoInicial: string;
  combinaComIdInicial: string;
  outrosQuiosques: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [modalidade, setModalidade] = useState<ModalidadeQuiosque>(modalidadeInicial);
  const [tipo, setTipo] = useState<TipoQuiosque>(tipoInicial);
  const [cnpj, setCnpj] = useState(cnpjInicial);
  const [chavePix, setChavePix] = useState(chavePixInicial);
  const [dica, setDica] = useState(dicaInicial);
  const [mensagemPreparando, setMensagemPreparando] = useState(mensagemPreparandoInicial);
  const [mensagemPronto, setMensagemPronto] = useState(mensagemProntoInicial);
  const [combinaComId, setCombinaComId] = useState(combinaComIdInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvo(false);

    if (!nome.trim()) {
      setErro("Informe o nome do quiosque.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/eventos/${eventoId}/quiosques/${quiosqueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          modalidade,
          tipo,
          cnpj: tipo === "INDEPENDENTE" ? cnpj.trim() : undefined,
          chavePix: tipo === "INDEPENDENTE" ? chavePix.trim() : undefined,
          dica,
          mensagemPreparando,
          mensagemPronto,
          combinaComId,
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o quiosque.");
        setEnviando(false);
        return;
      }

      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <div className="campo">
        <label>Nome do quiosque</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="campo">
        <label>Modalidade</label>
        <select value={modalidade} onChange={(e) => setModalidade(e.target.value as ModalidadeQuiosque)} style={estiloSelect}>
          {MODALIDADES.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Modelo de recebimento</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoQuiosque)} style={estiloSelect}>
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
            <input type="text" value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="chave@pix.com" />
          </div>
        </>
      )}

      <div className="campo">
        <label>Dica pros clientes (aparece na praça do evento e na loja do quiosque)</label>
        <input
          type="text"
          value={dica}
          onChange={(e) => setDica(e.target.value)}
          placeholder='Ex.: "Não deixe de provar nossa pipoca doce!"'
        />
      </div>
      <div className="campo">
        <label>Mensagem enquanto o pedido está sendo preparado</label>
        <input
          type="text"
          value={mensagemPreparando}
          onChange={(e) => setMensagemPreparando(e.target.value)}
          placeholder='Ex.: "Já estou sentindo o cheirinho!"'
        />
      </div>
      <div className="campo">
        <label>Mensagem quando o pedido fica pronto</label>
        <input
          type="text"
          value={mensagemPronto}
          onChange={(e) => setMensagemPronto(e.target.value)}
          placeholder='Ex.: "Pipoca quentinha te esperando!"'
        />
      </div>
      {outrosQuiosques.length > 0 && (
        <div className="campo">
          <label>Combina com (sugestão de compra pro cliente)</label>
          <select value={combinaComId} onChange={(e) => setCombinaComId(e.target.value)} style={estiloSelect}>
            <option value="">Nenhum</option>
            {outrosQuiosques.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="texto-fraco" style={{ marginBottom: 10 }}>
        Deixe dica/mensagens em branco pra usar o texto padrão do Cathan.
      </p>

      {erro && (
        <div className="aviso" style={{ marginBottom: 10 }}>
          {erro}
        </div>
      )}

      <button type="button" className="btn btn-primario btn-bloco" disabled={enviando} onClick={salvar}>
        {enviando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar alterações"}
      </button>
    </div>
  );
}
