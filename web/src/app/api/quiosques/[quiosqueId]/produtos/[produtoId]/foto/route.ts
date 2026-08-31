import { put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { quiosqueId: string; produtoId: string } }
) {
  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, quiosqueId: params.quiosqueId },
    include: { quiosque: { select: { id: true, tipo: true, senhaHash: true } } },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, produto.quiosque);
  if (bloqueado) return bloqueado;

  const corpo = await req.formData();
  const arquivo = corpo.get("foto");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo de imagem em 'foto'." }, { status: 400 });
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return NextResponse.json({ erro: "Formato inválido — use PNG, JPG ou WEBP." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande — máximo 3MB." }, { status: 400 });
  }

  if (produto.fotoUrl) {
    await del(produto.fotoUrl).catch(() => {});
  }

  const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`fotos-produto/${produto.id}-${Date.now()}.${extensao}`, arquivo, {
    access: "public",
  });

  await prisma.produto.update({ where: { id: produto.id }, data: { fotoUrl: blob.url } });

  return NextResponse.json({ fotoUrl: blob.url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { quiosqueId: string; produtoId: string } }
) {
  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, quiosqueId: params.quiosqueId },
    include: { quiosque: { select: { id: true, tipo: true, senhaHash: true } } },
  });
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, produto.quiosque);
  if (bloqueado) return bloqueado;

  if (produto.fotoUrl) {
    await del(produto.fotoUrl).catch(() => {});
  }

  await prisma.produto.update({ where: { id: produto.id }, data: { fotoUrl: null } });

  return NextResponse.json({ ok: true });
}
