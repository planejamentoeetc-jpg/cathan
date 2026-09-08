// Script temporário -- prova que a chave sk_test_ do Pagar.me cria um
// recebedor via API. Payload abaixo já validado campo a campo (passou de 422
// pra 412) -- só falta a conta ter a permissão "PSP"/Marketplace liberada
// pelo Pagar.me/Stone pra esse 412 sumir. Ver [[cathan_baas_provider_decision]].
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

async function main() {
  const chave = process.env.PAGARME_SECRET_KEY_TESTE;
  if (!chave) throw new Error("PAGARME_SECRET_KEY_TESTE não configurada.");
  const auth = Buffer.from(`${chave}:`).toString("base64");

  const body = {
    register_information: {
      email: "teste-recebedor@cathan.com.br",
      document: "11444777000161", // CNPJ de teste válido (Serasa)
      type: "corporation",
      company_name: "Restaurante Teste Cathan",
      trading_name: "Restaurante Teste Cathan LTDA",
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
          document: "11144477735", // CPF de teste válido
          birthdate: "1990-01-01",
          professional_occupation: "Empresario",
          monthly_income: 5000, // numérico, apesar do exemplo da doc mostrar texto "de R$X até R$Y"
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
      holder_name: "Restaurante Teste Cathan LTDA",
      holder_type: "company",
      holder_document: "11444777000161",
      bank: "341",
      branch_number: "0001",
      branch_check_digit: "0",
      account_number: "12345",
      account_check_digit: "6",
      type: "checking",
    },
  };

  const resposta = await fetch(`${BASE_URL}/recipients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
  });

  console.log("status", resposta.status);
  console.log(await resposta.text());
}

main().catch((erro) => {
  console.error("Falha ao criar recebedor:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
