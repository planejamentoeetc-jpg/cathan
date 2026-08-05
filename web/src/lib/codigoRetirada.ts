import { Prisma } from "@prisma/client";

// Sem letras/números ambíguos: sem O/0, sem I/1.
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAMANHO = 4;
const TENTATIVAS_MAX = 10;

export function gerarCodigoRetirada(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO; i++) {
    codigo += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return codigo;
}

/**
 * Gera um código de retirada e cria o sub-pedido dentro da mesma transação,
 * tentando novamente em caso de colisão com o índice único (quiosqueId, codigoRetirada).
 */
export async function criarSubPedidoComCodigoUnico<T>(
  criar: (codigo: string) => Promise<T>
): Promise<T> {
  for (let tentativa = 0; tentativa < TENTATIVAS_MAX; tentativa++) {
    const codigo = gerarCodigoRetirada();
    try {
      return await criar(codigo);
    } catch (erro) {
      const ehColisao =
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === "P2002";
      if (!ehColisao || tentativa === TENTATIVAS_MAX - 1) {
        throw erro;
      }
    }
  }
  throw new Error("Não foi possível gerar um código de retirada único.");
}
