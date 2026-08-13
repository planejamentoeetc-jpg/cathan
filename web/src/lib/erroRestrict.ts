import { Prisma } from "@prisma/client";

// onDelete: Restrict no Postgres é sinalizado com SQLSTATE 23001 (restrict_violation),
// que o Prisma NÃO mapeia pro P2003 conhecido (esse é reservado pro 23503 padrão) —
// por isso checamos as duas formas. Ver DELETE /api/eventos/[eventoId] pro caso
// original que descobriu isso.
export function ehViolacaoRestrict(erro: unknown): boolean {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") return true;
  if (erro instanceof Prisma.PrismaClientUnknownRequestError && erro.message.includes("23001")) return true;
  return false;
}
