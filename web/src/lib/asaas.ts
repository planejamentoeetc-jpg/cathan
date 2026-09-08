// Cliente da API do Asaas -- EXPLORATÓRIO, ainda não ligado ao checkout real
// do Cathan. Objetivo: validar se o split 1:N (vários recebedores numa única
// cobrança Pix) resolve o problema que o Mercado Pago não resolve no modelo
// self-service (ver DOCUMENTOS/CLAUDE.md, seção de split). Usa
// api-sandbox.asaas.com por padrão -- trocar ASAAS_API_BASE_URL pra produção
// só depois de validar o mecanismo.

const BASE_URL = process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";

function chaveApi(): string {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new Error("ASAAS_API_KEY não configurada no servidor.");
  return chave;
}

async function chamarAsaas<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      access_token: chaveApi(),
      ...opcoes.headers,
    },
  });

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    const mensagem = dados?.errors?.map((e: { description: string }) => e.description).join("; ") ?? texto;
    throw new Error(`Asaas ${opcoes.method ?? "GET"} ${caminho} -> ${resposta.status}: ${mensagem}`);
  }

  return dados as T;
}

export type SubcontaAsaas = {
  id: string;
  name: string;
  email: string;
  walletId: string;
  apiKey: string; // só vem preenchido na criação -- guardar na hora, não dá pra recuperar depois
  cpfCnpj: string;
};

// Só pessoa jurídica pode criar subconta (restrição do Asaas) -- por isso
// companyType é obrigatório no nosso caso de uso (restaurante).
export async function criarSubcontaRestaurante(dados: {
  nome: string;
  email: string;
  cnpj: string;
  celular: string;
  faturamentoMensalEstimado: number;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
}): Promise<SubcontaAsaas> {
  return chamarAsaas<SubcontaAsaas>("/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: dados.nome,
      email: dados.email,
      cpfCnpj: dados.cnpj.replace(/\D/g, ""),
      mobilePhone: dados.celular.replace(/\D/g, ""),
      incomeValue: dados.faturamentoMensalEstimado,
      address: dados.endereco,
      addressNumber: dados.numero,
      province: dados.bairro,
      postalCode: dados.cep.replace(/\D/g, ""),
      companyType: "MEI",
    }),
  });
}

export type ClienteAsaas = { id: string };

export async function criarClientePagador(dados: {
  nome: string;
  cpfCnpj: string;
}): Promise<ClienteAsaas> {
  return chamarAsaas<ClienteAsaas>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: dados.nome, cpfCnpj: dados.cpfCnpj.replace(/\D/g, "") }),
  });
}

export type DivisaoSplit = { walletId: string; valorFixo?: number; percentual?: number };

export type CobrancaAsaas = {
  id: string;
  status: string;
  value: number;
  pixTransaction?: { qrCode?: { payload: string; encodedImage: string } };
};

export async function criarCobrancaPixComSplit(dados: {
  clienteId: string;
  valorTotal: number;
  descricao: string;
  referenciaExterna: string;
  divisoes: DivisaoSplit[];
}): Promise<CobrancaAsaas> {
  return chamarAsaas<CobrancaAsaas>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.clienteId,
      billingType: "PIX",
      value: dados.valorTotal,
      dueDate: new Date().toISOString().slice(0, 10),
      description: dados.descricao,
      externalReference: dados.referenciaExterna,
      split: dados.divisoes.map((d) => ({
        walletId: d.walletId,
        ...(d.valorFixo !== undefined ? { fixedValue: d.valorFixo } : {}),
        ...(d.percentual !== undefined ? { percentualValue: d.percentual } : {}),
      })),
    }),
  });
}

// QR code Pix só fica pronto alguns instantes depois da cobrança ser criada
export async function obterQrCodePix(cobrancaId: string): Promise<{ payload: string; encodedImage: string }> {
  return chamarAsaas(`/payments/${cobrancaId}/pixQrCode`);
}

export async function consultarCobranca(cobrancaId: string): Promise<CobrancaAsaas> {
  return chamarAsaas(`/payments/${cobrancaId}`);
}
