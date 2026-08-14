-- AlterTable: comissão passa a ser configurável por evento, não por organizador
ALTER TABLE "eventos" ADD COLUMN     "comissao_percentual" DECIMAL(5,2) NOT NULL DEFAULT 4.9;

-- Backfill: cada evento herda o valor que já estava configurado no organizador dele
UPDATE "eventos"
SET "comissao_percentual" = "organizadores"."comissao_percentual"
FROM "organizadores"
WHERE "eventos"."organizador_id" = "organizadores"."id";

-- AlterTable
ALTER TABLE "organizadores" DROP COLUMN "comissao_percentual";
