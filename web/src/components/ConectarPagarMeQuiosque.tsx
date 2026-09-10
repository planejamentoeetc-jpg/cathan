"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Endereco = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  pontoReferencia: string;
};

const ENDERECO_VAZIO: Endereco = {
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pontoReferencia: "",
};

function CamposEndereco({
  valor,
  onChange,
  desabilitado,
}: {
  valor: Endereco;
  onChange: (e: Endereco) => void;
  desabilitado?: boolean;
}) {
  const set = (campo: keyof Endereco) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...valor, [campo]: ev.target.value });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <label className="campo">
        <span>CEP</span>
        <input value={valor.cep} onChange={set("cep")} disabled={desabilitado} inputMode="numeric" />
      </label>
      <label className="campo">
        <span>UF</span>
        <input value={valor.uf} onChange={set("uf")} disabled={desabilitado} maxLength={2} />
      </label>
      <label className="campo" style={{ gridColumn: "1 / -1" }}>
        <span>Rua</span>
        <input value={valor.rua} onChange={set("rua")} disabled={desabilitado} />
      </label>
      <label className="campo">
        <span>Número</span>
        <input value={valor.numero} onChange={set("numero")} disabled={desabilitado} />
      </label>
      <label className="campo">
        <span>Complemento</span>
        <input value={valor.complemento} onChange={set("complemento")} disabled={desabilitado} />
      </label>
      <label className="campo">
        <span>Bairro</span>
        <input value={valor.bairro} onChange={set("bairro")} disabled={desabilitado} />
      </label>
      <label className="campo">
        <span>Cidade</span>
        <input value={valor.cidade} onChange={set("cidade")} disabled={desabilitado} />
      </label>
      <label className="campo" style={{ gridColumn: "1 / -1" }}>
        <span>Ponto de referência</span>
        <input
          value={valor.pontoReferencia}
          onChange={set("pontoReferencia")}
          disabled={desabilitado}
        />
      </label>
    </div>
  );
}

// Formulário de KYC pra criar o recebedor Pagar.me do restaurante (split N:1).
// Diferente do Mercado Pago (um clique de OAuth), aqui o gestor preenche os
// dados cadastrais + representante legal + conta bancária junto com o
// responsável do restaurante.
export function ConectarPagarMeQuiosque({
  apiUrl,
  jaConectado,
  statusInicial,
  cnpjInicial,
  nomeInicial,
}: {
  apiUrl: string;
  jaConectado: boolean;
  statusInicial: string | null;
  cnpjInicial: string;
  nomeInicial: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // empresa
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState(cnpjInicial);
  const [nomeFantasia, setNomeFantasia] = useState(nomeInicial);
  const [razaoSocial, setRazaoSocial] = useState("");
  const [faturamentoAnual, setFaturamentoAnual] = useState("");
  const [celularEmpresa, setCelularEmpresa] = useState("");
  const [enderecoEmpresa, setEnderecoEmpresa] = useState<Endereco>(ENDERECO_VAZIO);

  // representante
  const [repNome, setRepNome] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repCpf, setRepCpf] = useState("");
  const [repNascimento, setRepNascimento] = useState("");
  const [repRenda, setRepRenda] = useState("");
  const [repOcupacao, setRepOcupacao] = useState("");
  const [repCelular, setRepCelular] = useState("");
  const [repMesmoEndereco, setRepMesmoEndereco] = useState(true);
  const [repEndereco, setRepEndereco] = useState<Endereco>(ENDERECO_VAZIO);

  // conta bancária
  const [holderName, setHolderName] = useState("");
  const [holderType, setHolderType] = useState<"company" | "individual">("company");
  const [holderDocument, setHolderDocument] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [agenciaDigito, setAgenciaDigito] = useState("");
  const [conta, setConta] = useState("");
  const [contaDigito, setContaDigito] = useState("");
  const [tipoConta, setTipoConta] = useState<"checking" | "savings">("checking");

  if (jaConectado) {
    return (
      <div className="cartao">
        <div className="g-row">
          Status
          <span className="val" style={{ color: statusInicial === "active" ? "var(--verde)" : "var(--festa)" }}>
            {statusInicial === "active" ? "✓ recebedor ativo" : `recebedor criado — ${statusInicial ?? "verificando"}`}
          </span>
        </div>
        <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
          O restaurante já tem um recebedor Pagar.me. Se o status não estiver “active”, o Pagar.me
          ainda está verificando os dados cadastrais.
        </p>
      </div>
    );
  }

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          cnpj,
          nomeFantasia,
          razaoSocial,
          faturamentoAnual: Number(faturamentoAnual),
          celularEmpresa,
          enderecoEmpresa,
          representante: {
            nome: repNome,
            email: repEmail,
            cpf: repCpf,
            dataNascimento: repNascimento,
            rendaMensal: Number(repRenda),
            ocupacao: repOcupacao,
            celular: repCelular,
            endereco: repMesmoEndereco ? enderecoEmpresa : repEndereco,
          },
          contaBancaria: {
            holderName,
            holderType,
            holderDocument,
            banco,
            agencia,
            agenciaDigito,
            conta,
            contaDigito,
            tipo: tipoConta,
          },
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível criar o recebedor.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro inesperado ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <p className="texto-fraco" style={{ marginBottom: 16 }}>
        Preencha junto com o responsável do restaurante. Esses dados vão pro Pagar.me criar o
        recebedor que recebe a parte dele nas vendas divididas.
      </p>

      <h6 style={{ fontFamily: "var(--font-sora)", marginBottom: 10 }}>Empresa</h6>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="campo">
          <span>CNPJ</span>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>E-mail da empresa</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
        <label className="campo">
          <span>Nome fantasia</span>
          <input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
        </label>
        <label className="campo">
          <span>Razão social</span>
          <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
        </label>
        <label className="campo">
          <span>Faturamento anual (R$)</span>
          <input
            value={faturamentoAnual}
            onChange={(e) => setFaturamentoAnual(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="campo">
          <span>Celular da empresa</span>
          <input
            value={celularEmpresa}
            onChange={(e) => setCelularEmpresa(e.target.value)}
            inputMode="tel"
            placeholder="DDD + número"
          />
        </label>
      </div>

      <h6 style={{ fontFamily: "var(--font-sora)", margin: "6px 0 10px" }}>Endereço da empresa</h6>
      <CamposEndereco valor={enderecoEmpresa} onChange={setEnderecoEmpresa} />

      <h6 style={{ fontFamily: "var(--font-sora)", margin: "6px 0 10px" }}>Representante legal</h6>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="campo">
          <span>Nome completo</span>
          <input value={repNome} onChange={(e) => setRepNome(e.target.value)} />
        </label>
        <label className="campo">
          <span>CPF</span>
          <input value={repCpf} onChange={(e) => setRepCpf(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>E-mail</span>
          <input value={repEmail} onChange={(e) => setRepEmail(e.target.value)} type="email" />
        </label>
        <label className="campo">
          <span>Data de nascimento</span>
          <input value={repNascimento} onChange={(e) => setRepNascimento(e.target.value)} type="date" />
        </label>
        <label className="campo">
          <span>Renda mensal (R$)</span>
          <input value={repRenda} onChange={(e) => setRepRenda(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>Ocupação</span>
          <input value={repOcupacao} onChange={(e) => setRepOcupacao(e.target.value)} />
        </label>
        <label className="campo">
          <span>Celular</span>
          <input
            value={repCelular}
            onChange={(e) => setRepCelular(e.target.value)}
            inputMode="tel"
            placeholder="DDD + número"
          />
        </label>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "4px 0 10px", fontSize: 13 }}>
        <input
          type="checkbox"
          checked={repMesmoEndereco}
          onChange={(e) => setRepMesmoEndereco(e.target.checked)}
        />
        Endereço do representante é o mesmo da empresa
      </label>
      {!repMesmoEndereco && <CamposEndereco valor={repEndereco} onChange={setRepEndereco} />}

      <h6 style={{ fontFamily: "var(--font-sora)", margin: "6px 0 10px" }}>Conta bancária</h6>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="campo">
          <span>Titular da conta</span>
          <input value={holderName} onChange={(e) => setHolderName(e.target.value)} />
        </label>
        <label className="campo">
          <span>Tipo do titular</span>
          <select value={holderType} onChange={(e) => setHolderType(e.target.value as "company" | "individual")}>
            <option value="company">Pessoa jurídica</option>
            <option value="individual">Pessoa física</option>
          </select>
        </label>
        <label className="campo">
          <span>CPF/CNPJ do titular</span>
          <input value={holderDocument} onChange={(e) => setHolderDocument(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>Banco (código, ex.: 341)</span>
          <input value={banco} onChange={(e) => setBanco(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>Agência</span>
          <input value={agencia} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>Dígito da agência (se tiver)</span>
          <input value={agenciaDigito} onChange={(e) => setAgenciaDigito(e.target.value)} />
        </label>
        <label className="campo">
          <span>Conta</span>
          <input value={conta} onChange={(e) => setConta(e.target.value)} inputMode="numeric" />
        </label>
        <label className="campo">
          <span>Dígito da conta</span>
          <input value={contaDigito} onChange={(e) => setContaDigito(e.target.value)} />
        </label>
        <label className="campo">
          <span>Tipo de conta</span>
          <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value as "checking" | "savings")}>
            <option value="checking">Corrente</option>
            <option value="savings">Poupança</option>
          </select>
        </label>
      </div>

      {erro && (
        <div className="aviso" style={{ margin: "10px 0" }}>
          {erro}
        </div>
      )}

      <button type="button" className="btn btn-primario btn-bloco" disabled={enviando} onClick={enviar}>
        {enviando ? "Criando recebedor…" : "Criar recebedor Pagar.me"}
      </button>
    </div>
  );
}
