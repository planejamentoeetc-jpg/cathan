import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM — usado só pra guardar o access_token/refresh_token do Mercado
// Pago de cada organizador (a primeira credencial de terceiro que a Cathan
// passa a armazenar). Nunca usar em Edge Runtime (middleware) — só em rotas
// de servidor normais (Node runtime), onde o módulo `crypto` nativo funciona.
const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12; // recomendado pelo GCM

function obterChave(): Buffer {
  const chaveBase64 = process.env.SEGREDO_CIFRA_KEY;
  if (!chaveBase64) {
    throw new Error("SEGREDO_CIFRA_KEY não configurada no servidor.");
  }
  const chave = Buffer.from(chaveBase64, "base64");
  if (chave.length !== 32) {
    throw new Error(
      "SEGREDO_CIFRA_KEY precisa decodificar pra 32 bytes — gere com crypto.randomBytes(32).toString(\"base64\")."
    );
  }
  return chave;
}

/** Formato: base64(iv) . base64(authTag) . base64(cifrado) */
export function cifrar(textoPlano: string): string {
  const chave = obterChave();
  const iv = randomBytes(TAMANHO_IV);
  const cifra = createCipheriv(ALGORITMO, chave, iv);
  const cifrado = Buffer.concat([cifra.update(textoPlano, "utf8"), cifra.final()]);
  const authTag = cifra.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${cifrado.toString("base64")}`;
}

export function decifrar(textoCifrado: string): string {
  const chave = obterChave();
  const [ivB64, authTagB64, cifradoB64] = textoCifrado.split(".");
  if (!ivB64 || !authTagB64 || !cifradoB64) {
    throw new Error("Formato de texto cifrado inválido.");
  }

  const decifra = createDecipheriv(ALGORITMO, chave, Buffer.from(ivB64, "base64"));
  decifra.setAuthTag(Buffer.from(authTagB64, "base64"));
  const textoPlano = Buffer.concat([decifra.update(Buffer.from(cifradoB64, "base64")), decifra.final()]);
  return textoPlano.toString("utf8");
}
