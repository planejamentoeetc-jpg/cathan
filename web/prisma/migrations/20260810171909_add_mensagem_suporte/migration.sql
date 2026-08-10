-- CreateEnum
CREATE TYPE "RemetenteSuporte" AS ENUM ('GESTOR', 'CATHAN');

-- CreateTable
CREATE TABLE "mensagens_suporte" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "de" "RemetenteSuporte" NOT NULL,
    "texto" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_suporte_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mensagens_suporte" ADD CONSTRAINT "mensagens_suporte_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
