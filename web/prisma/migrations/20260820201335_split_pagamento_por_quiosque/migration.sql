-- AlterTable
ALTER TABLE "quiosques" ADD COLUMN     "comissao_percentual" DECIMAL(5,2),
ADD COLUMN     "mp_access_token_cifrado" TEXT,
ADD COLUMN     "mp_refresh_token_cifrado" TEXT,
ADD COLUMN     "mp_token_expira_em" TIMESTAMP(3),
ADD COLUMN     "mp_user_id" TEXT;
