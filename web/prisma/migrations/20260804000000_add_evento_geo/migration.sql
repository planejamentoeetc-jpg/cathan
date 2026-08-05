-- AlterTable
ALTER TABLE "eventos" ADD COLUMN "latitude" DOUBLE PRECISION,
                       ADD COLUMN "longitude" DOUBLE PRECISION;

-- Raio de pedidos só é aplicável quando o evento tem um ponto central definido
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_raio_requer_coordenadas"
    CHECK (
        ("raio_pedidos_metros" IS NULL AND "latitude" IS NULL AND "longitude" IS NULL)
        OR
        ("raio_pedidos_metros" IS NOT NULL AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL)
    );
