-- Regras de integridade que o Prisma Schema não expressa nativamente
-- (adicionadas à mão, como em um `prisma migrate dev --create-only`)

-- Quiosque independente precisa de CNPJ e chave PIX; quiosque do evento não usa esses campos
ALTER TABLE "quiosques" ADD CONSTRAINT "quiosques_independente_requer_cnpj_pix"
    CHECK (
        ("tipo" = 'DO_EVENTO' AND "cnpj" IS NULL AND "chave_pix" IS NULL)
        OR
        ("tipo" = 'INDEPENDENTE' AND "cnpj" IS NOT NULL AND "chave_pix" IS NOT NULL)
    );

-- Usuario com perfil QUIOSQUE precisa estar vinculado a um quiosque; os demais perfis não
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_quiosque_id_conforme_perfil"
    CHECK (
        ("perfil" = 'QUIOSQUE' AND "quiosque_id" IS NOT NULL)
        OR
        ("perfil" != 'QUIOSQUE' AND "quiosque_id" IS NULL)
    );
