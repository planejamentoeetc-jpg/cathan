-- CNPJ/chave PIX deixam de ser obrigatórios pra quiosque INDEPENDENTE: a
-- conexão real de recebimento é feita via OAuth do Mercado Pago
-- (mpAccessTokenCifrado), não por esses campos digitados. O quiosque agora
-- pode ser criado só com nome/modalidade/tipo, e o gestor/restaurante
-- preenche o resto (produtos, logo, CNPJ/PIX, conexão MP) depois, na tela
-- própria do quiosque.
ALTER TABLE "quiosques" DROP CONSTRAINT "quiosques_independente_requer_cnpj_pix";

ALTER TABLE "quiosques" ADD CONSTRAINT "quiosques_independente_requer_cnpj_pix"
    CHECK (
        ("tipo" = 'DO_EVENTO' AND "cnpj" IS NULL AND "chave_pix" IS NULL)
        OR
        ("tipo" = 'INDEPENDENTE' AND (
            ("cnpj" IS NULL AND "chave_pix" IS NULL)
            OR
            ("cnpj" IS NOT NULL AND "chave_pix" IS NOT NULL)
        ))
    );
