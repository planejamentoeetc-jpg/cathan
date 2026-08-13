-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "organizador_id" TEXT;

-- CreateTable
CREATE TABLE "organizadores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "comissao_percentual" DECIMAL(5,2) NOT NULL DEFAULT 4.9,
    "mp_user_id" TEXT,
    "mp_access_token_cifrado" TEXT,
    "mp_refresh_token_cifrado" TEXT,
    "mp_token_expira_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizadores_email_key" ON "organizadores"("email");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "organizadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
