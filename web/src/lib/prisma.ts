import { Prisma, PrismaClient } from "@prisma/client";

// Códigos de erro do engine que indicam problema transitório de conexão
// (típico do banco "acordando" depois de ficar inativo em planos serverless
// como o Neon free tier), não um erro de dados — só esses valem retry.
const CODIGOS_RETRIAVEIS = new Set(["P1001", "P1002", "P1008", "P1017"]);
const MAX_TENTATIVAS = 4;
const ATRASO_BASE_MS = 400;

function ehErroDeConexao(erro: unknown): boolean {
  if (erro instanceof Prisma.PrismaClientInitializationError) return true;
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return CODIGOS_RETRIAVEIS.has(erro.code);
  }
  return false;
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function criarClient() {
  return new PrismaClient().$extends({
    name: "retry-conexao",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
            try {
              return await query(args);
            } catch (erro) {
              const ultimaTentativa = tentativa === MAX_TENTATIVAS;
              if (ultimaTentativa || !ehErroDeConexao(erro)) {
                throw erro;
              }
              await esperar(ATRASO_BASE_MS * tentativa);
            }
          }
          // inatingível (o loop sempre retorna ou lança), só pra satisfazer o compilador
          throw new Error("Falha inesperada no retry de conexão.");
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof criarClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? criarClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
