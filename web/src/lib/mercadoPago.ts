import { MercadoPagoConfig } from "mercadopago";

const globalForMp = globalThis as unknown as {
  mercadoPago: MercadoPagoConfig | undefined;
};

function criarClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN não configurado no servidor.");
  }
  return new MercadoPagoConfig({ accessToken });
}

export const mercadoPagoClient = globalForMp.mercadoPago ?? criarClient();

if (process.env.NODE_ENV !== "production") {
  globalForMp.mercadoPago = mercadoPagoClient;
}

/** Credenciais TEST- usam a URL de sandbox; credenciais de produção usam a URL real. */
export function ehAmbienteSandbox(): boolean {
  return (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-");
}
