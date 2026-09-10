// Cliente da API do Pagar.me. Usado no split N:1 (vários restaurantes recebendo
// de uma única cobrança Pix) -- o que o Mercado Pago não divide. Provedor BaaS
// escolhido no lugar do Asaas (lib/asaas.ts, só referência histórica) pelo
// reconhecimento do selo Stone junto ao cliente final.
//
// PAGARME_SECRET_KEY = chave secreta da conta marketplace da Cathan. Em dev é a
// chave sk_test_... do sandbox; em produção (Vercel) é a sk_... real da conta
// com PSP/Split habilitado.

const BASE_URL = "https://api.pagar.me/core/v5";

function chaveApi(): string {
  const chave = process.env.PAGARME_SECRET_KEY;
  if (!chave) throw new Error("PAGARME_SECRET_KEY não configurada no servidor.");
  return chave;
}

function separarDdd(celular: string): { ddd: string; number: string } {
  const digitos = celular.replace(/\D/g, "");
  return { ddd: digitos.slice(0, 2), number: digitos.slice(2) };
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

export type EnderecoRecebedor = {
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pontoReferencia: string;
};

function enderecoParaApi(e: EnderecoRecebedor) {
  return {
    street: e.rua,
    street_number: e.numero,
    complementary: e.complemento,
    neighborhood: e.bairro,
    city: e.cidade,
    state: e.uf,
    zip_code: e.cep.replace(/\D/g, ""),
    reference_point: e.pontoReferencia,
  };
}

// Só pessoa jurídica -- restaurante independente sempre tem CNPJ (ver
// Quiosque.cnpj, obrigatório pra tipo=INDEPENDENTE). Todos os campos abaixo são
// exigidos pelo Pagar.me pra recebedor "corporation" (vários deles não aparecem
// como obrigatórios na doc, mas a API recusa sem eles -- validado campo a campo).
export async function criarRecebedorRestaurante(dados: {
  // empresa
  email: string;
  cnpj: string;
  nomeFantasia: string;
  razaoSocial: string;
  faturamentoAnual: number;
  celularEmpresa: string;
  enderecoEmpresa: EnderecoRecebedor;
  // representante legal
  representante: {
    nome: string;
    email: string;
    cpf: string;
    dataNascimento: string; // AAAA-MM-DD
    rendaMensal: number;
    ocupacao: string;
    celular: string;
    endereco: EnderecoRecebedor;
  };
  contaBancaria: ContaBancariaRecebedor;
  code?: string;
}): Promise<RecebedorPagarMe> {
  const telEmpresa = separarDdd(dados.celularEmpresa);
  const telRep = separarDdd(dados.representante.celular);

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
        phone_numbers: [{ ddd: telEmpresa.ddd, number: telEmpresa.number, type: "mobile" }],
        main_address: enderecoParaApi(dados.enderecoEmpresa),
        managing_partners: [
          {
            name: dados.representante.nome,
            email: dados.representante.email,
            document: dados.representante.cpf.replace(/\D/g, ""),
            birthdate: dados.representante.dataNascimento,
            monthly_income: dados.representante.rendaMensal,
            professional_occupation: dados.representante.ocupacao,
            self_declared_legal_representative: true,
            phone_numbers: [{ ddd: telRep.ddd, number: telRep.number, type: "mobile" }],
            address: enderecoParaApi(dados.representante.endereco),
          },
        ],
      },
      default_bank_account: dados.contaBancaria,
    }),
  });
}

export async function obterRecebedor(recebedorId: string): Promise<RecebedorPagarMe> {
  return chamarPagarMe(`/recipients/${recebedorId}`);
}

// Recebedor "de si mesma" da conta marketplace -- é ele que recebe a comissão
// da Cathan (o resto do split). Split do Pagar.me tem que somar 100%, então a
// comissão nunca é "resto implícito": é sempre uma regra explícita apontando
// pra este recebedor.
export async function obterRecebedorPadrao(): Promise<RecebedorPagarMe> {
  return chamarPagarMe("/recipients/default");
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
  // não na resposta da criação).
  const { ddd, number } = separarDdd(dados.clienteCelular);

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
        phones: { mobile_phone: { country_code: "55", area_code: ddd, number } },
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
