// Cliente da API do Pagar.me -- EXPLORATÓRIO, ainda não ligado ao checkout real
// do Cathan. Objetivo: validar se o split N:1 (vários recebedores numa única
// cobrança Pix) funciona no ambiente de Teste. Provedor BaaS escolhido no lugar
// do Asaas (ver lib/asaas.ts, mantido só como referência histórica) por causa
// do reconhecimento de marca do selo Stone junto ao cliente final.

const BASE_URL = "https://api.pagar.me/core/v5";

function chaveApi(): string {
  const chave = process.env.PAGARME_SECRET_KEY_TESTE;
  if (!chave) throw new Error("PAGARME_SECRET_KEY_TESTE não configurada no servidor.");
  return chave;
}

async function chamarPagarMe<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  // Basic Auth: usuário = chave secreta, senha em branco (padrão Pagar.me)
  const auth = Buffer.from(`${chaveApi()}:`).toString("base64");

  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...opcoes.headers,
    },
  });

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    const mensagem =
      dados?.message ?? (Array.isArray(dados?.errors) ? dados.errors.join("; ") : JSON.stringify(dados)) ?? texto;
    throw new Error(`Pagar.me ${opcoes.method ?? "GET"} ${caminho} -> ${resposta.status}: ${mensagem}`);
  }

  return dados as T;
}

export type ContaBancariaRecebedor = {
  holder_name: string;
  holder_type: "individual" | "company";
  holder_document: string;
  bank: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  type: "checking" | "savings";
};

export type RecebedorPagarMe = {
  id: string;
  code?: string;
  status: string;
  register_information?: Record<string, unknown>;
  default_bank_account?: { id: string };
};

// Só pessoa jurídica -- restaurante independente sempre tem CNPJ (ver
// Quiosque.cnpj, obrigatório pra tipo=INDEPENDENTE).
export async function criarRecebedorRestaurante(dados: {
  email: string;
  cnpj: string;
  nomeFantasia: string;
  razaoSocial: string;
  faturamentoAnual: number;
  contaBancaria: ContaBancariaRecebedor;
  code?: string;
}): Promise<RecebedorPagarMe> {
  return chamarPagarMe<RecebedorPagarMe>("/recipients", {
    method: "POST",
    body: JSON.stringify({
      code: dados.code,
      register_information: {
        email: dados.email,
        document: dados.cnpj.replace(/\D/g, ""),
        type: "corporation",
        company_name: dados.nomeFantasia,
        trading_name: dados.razaoSocial,
        annual_revenue: dados.faturamentoAnual,
      },
      default_bank_account: dados.contaBancaria,
    }),
  });
}

export async function obterRecebedor(recebedorId: string): Promise<RecebedorPagarMe> {
  return chamarPagarMe(`/recipients/${recebedorId}`);
}

export type DivisaoSplitPagarMe = {
  recipientId: string;
  tipo: "flat" | "percentage";
  valor: number;
  responsavelPelaTaxa?: boolean;
};

export type PedidoPagarMe = {
  id: string;
  code?: string;
  status: string;
  charges?: Array<{
    id: string;
    status: string;
    last_transaction?: {
      qr_code?: string;
      qr_code_url?: string;
    };
  }>;
};

export async function criarPedidoPixComSplit(dados: {
  itens: Array<{ descricao: string; valorCentavos: number; quantidade: number }>;
  clienteNome: string;
  clienteDocumento: string;
  clienteEmail: string;
  clienteCelular: string;
  referenciaExterna: string;
  divisoes: DivisaoSplitPagarMe[];
}): Promise<PedidoPagarMe> {
  // Pagar.me exige pelo menos um telefone do cliente no pedido -- sem isso a
  // cobrança nasce direto como "failed" (erro só aparece no last_transaction,
  // não na resposta da criação). DDD = 2 primeiros dígitos, resto é o número.
  const celularDigitos = dados.clienteCelular.replace(/\D/g, "");
  const areaCode = celularDigitos.slice(0, 2);
  const number = celularDigitos.slice(2);

  return chamarPagarMe<PedidoPagarMe>("/orders", {
    method: "POST",
    body: JSON.stringify({
      code: dados.referenciaExterna,
      items: dados.itens.map((i) => ({
        description: i.descricao,
        amount: i.valorCentavos,
        quantity: i.quantidade,
      })),
      customer: {
        name: dados.clienteNome,
        email: dados.clienteEmail,
        document: dados.clienteDocumento.replace(/\D/g, ""),
        type: dados.clienteDocumento.replace(/\D/g, "").length > 11 ? "company" : "individual",
        phones: { mobile_phone: { country_code: "55", area_code: areaCode, number } },
      },
      payments: [
        {
          payment_method: "pix",
          pix: { expires_in: 3600 },
          split: dados.divisoes.map((d) => ({
            recipient_id: d.recipientId,
            type: d.tipo,
            amount: d.valor,
            options: { charge_processing_fee: d.responsavelPelaTaxa ?? false, liable: true },
          })),
        },
      ],
    }),
  });
}
