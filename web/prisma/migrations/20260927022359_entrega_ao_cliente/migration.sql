-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('RETIRADA', 'ENTREGA');

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "endereco_entrega" TEXT,
ADD COLUMN     "telefone_entrega" TEXT,
ADD COLUMN     "tipo_entrega" "TipoEntrega" NOT NULL DEFAULT 'RETIRADA';

-- AlterTable
ALTER TABLE "pedidos_pendentes" ADD COLUMN     "endereco_entrega" TEXT,
ADD COLUMN     "telefone_entrega" TEXT,
ADD COLUMN     "tipo_entrega" "TipoEntrega" NOT NULL DEFAULT 'RETIRADA';

-- AlterTable
ALTER TABLE "quiosques" ADD COLUMN     "entrega_habilitada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sub_pedidos" ADD COLUMN     "observacao_cliente" TEXT;
