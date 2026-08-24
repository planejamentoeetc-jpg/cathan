-- CreateEnum
CREATE TYPE "ModalidadeEvento" AS ENUM ('ORGANIZADOR_UNICO', 'MULTI_ESTABELECIMENTO');

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "modalidade" "ModalidadeEvento" NOT NULL DEFAULT 'ORGANIZADOR_UNICO';
