import { Prisma } from "@prisma/client";

const TENTATIVAS_MAX = 10;

/** 2 letras iniciais do nome do quiosque, maiúsculas e sem acento (ex.: "Pastel" -> "PA"). */
function prefixoQuiosque(nome: string): string {
  const letras = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return (letras.slice(0, 2) || "XX").padEnd(2, "X");
}

/**
 * Gera um código de retirada e cria o sub-pedido dentro da mesma transação. O
 * código é [2 letras do quiosque][sequencial de 3+ dígitos, por quiosque, na
 * ordem de chegada dos pedidos no evento] — ex.: "PA001", "PA002"... Tenta de
 * novo em caso de colisão com o índice único (quiosqueId, codigoRetirada),
 * recontando a sequência a cada tentativa.
 */
export async function criarSubPedidoComCodigoUnico<
  T,
  TxCliente extends {
    subPedido: { count: (args: { where: { quiosqueId: string; rodada: number } }) => Promise<number> };
  }
>(tx: TxCliente, quiosqueId: string, quiosqueNome: string, criar: (codigo: string) => Promise<T>): Promise<T> {
  const prefixo = prefixoQuiosque(quiosqueNome);

  for (let tentativa = 0; tentativa < TENTATIVAS_MAX; tentativa++) {
    // conta só a rodada 1 de cada família (pedido+quiosque) — reaberturas de um
    // mesmo pedido (rodada 2+) não avançam a numeração de códigos novos
    const existentes = await tx.subPedido.count({ where: { quiosqueId, rodada: 1 } });
    const codigo = `${prefixo}${String(existentes + 1).padStart(3, "0")}`;
    try {
      return await criar(codigo);
    } catch (erro) {
      const ehColisao =
        erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
      if (!ehColisao || tentativa === TENTATIVAS_MAX - 1) {
        throw erro;
      }
    }
  }
  throw new Error("Não foi possível gerar um código de retirada único.");
}
