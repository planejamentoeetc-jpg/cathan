-- CreateEnum
CREATE TYPE "ModalidadeQuiosque" AS ENUM ('ALIMENTACAO', 'BEBIDAS', 'BRINCADEIRAS');

-- CreateEnum
CREATE TYPE "TipoQuiosque" AS ENUM ('DO_EVENTO', 'INDEPENDENTE');

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('GESTOR', 'QUIOSQUE', 'CAIXA', 'TELA_PEDIDOS', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusSubPedido" AS ENUM ('RECEBIDO', 'ACEITO', 'EM_PRODUCAO', 'PRONTO', 'RETIRADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "raio_pedidos_metros" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiosques" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "modalidade" "ModalidadeQuiosque" NOT NULL,
    "cor" TEXT NOT NULL,
    "tipo" "TipoQuiosque" NOT NULL,
    "cnpj" TEXT,
    "chave_pix" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiosques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "quiosque_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "tempo_producao_minutos" INTEGER NOT NULL DEFAULT 0,
    "estoque" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_pedidos" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "quiosque_id" TEXT NOT NULL,
    "codigo_retirada" VARCHAR(4) NOT NULL,
    "status" "StatusSubPedido" NOT NULL DEFAULT 'RECEBIDO',
    "nomes_criancas" TEXT[],
    "aceito_por_usuario_id" TEXT,
    "aceito_em" TIMESTAMP(3),
    "pronto_em" TIMESTAMP(3),
    "retirado_por_usuario_id" TEXT,
    "retirado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_sub_pedido" (
    "id" TEXT NOT NULL,
    "sub_pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "itens_sub_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT,
    "quiosque_id" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_celular_key" ON "clientes"("celular");

-- CreateIndex
CREATE UNIQUE INDEX "sub_pedidos_quiosque_id_codigo_retirada_key" ON "sub_pedidos"("quiosque_id", "codigo_retirada");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "quiosques" ADD CONSTRAINT "quiosques_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_quiosque_id_fkey" FOREIGN KEY ("quiosque_id") REFERENCES "quiosques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_pedidos" ADD CONSTRAINT "sub_pedidos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_pedidos" ADD CONSTRAINT "sub_pedidos_quiosque_id_fkey" FOREIGN KEY ("quiosque_id") REFERENCES "quiosques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_pedidos" ADD CONSTRAINT "sub_pedidos_aceito_por_usuario_id_fkey" FOREIGN KEY ("aceito_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_pedidos" ADD CONSTRAINT "sub_pedidos_retirado_por_usuario_id_fkey" FOREIGN KEY ("retirado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_sub_pedido" ADD CONSTRAINT "itens_sub_pedido_sub_pedido_id_fkey" FOREIGN KEY ("sub_pedido_id") REFERENCES "sub_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_sub_pedido" ADD CONSTRAINT "itens_sub_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_quiosque_id_fkey" FOREIGN KEY ("quiosque_id") REFERENCES "quiosques"("id") ON DELETE SET NULL ON UPDATE CASCADE;
