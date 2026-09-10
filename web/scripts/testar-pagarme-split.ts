// Script temporário -- prova o split N:1 do Pagar.me ponta a ponta no sandbox:
// cria 2 recebedores, cria um pedido Pix dividido entre eles + a comissão da
// Cathan, e imprime o QR code + as regras de split que a API registrou.
// Apagar depois de validar.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const linha of readFileSync(envPath, "utf-8").split("\n")) {
    const match = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, chave, valorBruto] = match;
    if (process.env[chave]) continue;
    process.env[chave] = valorBruto.trim().replace(/^"(.*)"$/, "$1");
  }
}

const BASE_URL = "https://api.pagar.me/core/v5";
const chave = process.env.PAGARME_SECRET_KEY_TESTE;
if (!chave) throw new Error("PAGARME_SECRET_KEY_TESTE não configurada.");
const auth = Buffer.from(`${chave}:`).toString("base64");

async function pagarMe(caminho: string, body: unknown) {
  const r = await fetch(`${BASE_URL}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
  });
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw new Error(`POST ${caminho} -> ${r.status}: ${texto}`);
  return dados;
}

function corpoRecebedor(sufixo: string, cnpj: string) {
  return {
    register_information: {
      email: `recebedor-${sufixo}@cathan.com.br`,
      document: cnpj,
      type: "corporation",
      company_name: `Restaurante ${sufixo}`,
      trading_name: `Restaurante ${sufixo} LTDA`,
      annual_revenue: 1000000,
      phone_numbers: [{ ddd: "11", number: "999998888", type: "mobile" }],
      main_address: {
        street: "Avenida Paulista",
        complementary: "Sala 10",
        street_number: "1000",
        neighborhood: "Bela Vista",
        city: "Sao Paulo",
        state: "SP",
        zip_code: "01310100",
        reference_point: "Perto do metro",
      },
      managing_partners: [
        {
          name: "Wellington Martins",
          email: "wellington@cathan.com.br",
          document: "11144477735",
          birthdate: "1990-01-01",
          professional_occupation: "Empresario",
          monthly_income: 5000,
          self_declared_legal_representative: true,
          phone_numbers: [{ ddd: "11", number: "988887777", type: "mobile" }],
          address: {
            street: "Avenida Paulista",
            complementary: "Apto 10",
            street_number: "1000",
            neighborhood: "Bela Vista",
            city: "Sao Paulo",
            state: "SP",
            zip_code: "01310100",
            reference_point: "Perto do metro",
          },
        },
      ],
    },
    default_bank_account: {
      holder_name: `Restaurante ${sufixo} LTDA`,
      holder_type: "company",
      holder_document: cnpj,
      bank: "341",
      branch_number: "0001",
      branch_check_digit: "0",
      account_number: "12345",
      account_check_digit: "6",
      type: "checking",
    },
  };
}

async function main() {
  console.log("Criando recebedor A...");
  const recA = await pagarMe("/recipients", corpoRecebedor("A", "11444777000161"));
  console.log("  ->", recA.id, recA.status);

  console.log("Criando recebedor B...");
  const recB = await pagarMe("/recipients", corpoRecebedor("B", "11353677000120"));
  console.log("  ->", recB.id, recB.status);

  // Pedido de R$100,00 (10000 centavos): restaurante A 60%, restaurante B 30%,
  // Cathan 10%. O recebedor "Cathan" nesse split é o da própria conta principal
  // -- pegamos o id dele via GET /recipients?code... na prática; aqui só
  // dividimos entre A e B e deixamos o resto pra conta principal implícita.
  const valorTotal = 10000;
  console.log("\nCriando pedido Pix com split A=60% / B=40%...");
  const pedido = await pagarMe("/orders", {
    items: [{ description: "Pedido teste split", amount: valorTotal, quantity: 1 }],
    customer: {
      name: "Cliente Teste",
      email: "cliente-teste@cathan.com.br",
      document: "11144477735",
      type: "individual",
      phones: {
        mobile_phone: { country_code: "55", area_code: "11", number: "999998888" },
      },
    },
    payments: [
      {
        payment_method: "pix",
        pix: { expires_in: 3600 },
        split: [
          {
            recipient_id: recA.id,
            type: "percentage",
            amount: 60,
            options: { charge_processing_fee: true, liable: true, charge_remainder_fee: true },
          },
          {
            recipient_id: recB.id,
            type: "percentage",
            amount: 40,
            options: { charge_processing_fee: false, liable: true, charge_remainder_fee: false },
          },
        ],
      },
    ],
  });

  const charge = pedido.charges?.[0];
  const tx = charge?.last_transaction;
  console.log("\nPedido criado:", pedido.id, "status:", pedido.status);
  console.log("Cobrança:", charge?.id, "status:", charge?.status);
  console.log("Pix copia-e-cola:", tx?.qr_code);
  console.log("Split registrado:", JSON.stringify(charge?.last_transaction?.split ?? pedido.charges?.[0]?.split, null, 2));
}

main().catch((e) => {
  console.error("FALHA:", e instanceof Error ? e.message : e);
  process.exit(1);
});
