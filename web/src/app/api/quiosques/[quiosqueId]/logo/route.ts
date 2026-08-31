import { put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAcessoQuiosqueApi } from "@/lib/acessoQuiosqueApi";

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

  const corpo = await req.formData();
  const arquivo = corpo.get("logo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo de imagem em 'logo'." }, { status: 400 });
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return NextResponse.json({ erro: "Formato inválido — use PNG, JPG ou WEBP." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande — máximo 3MB." }, { status: 400 });
  }

  if (quiosque.logoUrl) {
    await del(quiosque.logoUrl).catch(() => {});
  }

  const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`logos-quiosque/${quiosque.id}-${Date.now()}.${extensao}`, arquivo, {
    access: "public",
  });

  await prisma.quiosque.update({ where: { id: quiosque.id }, data: { logoUrl: blob.url } });

  return NextResponse.json({ logoUrl: blob.url });
}

export async function DELETE(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  const bloqueado = await verificarAcessoQuiosqueApi(req, quiosque);
  if (bloqueado) return bloqueado;

  if (quiosque.logoUrl) {
    await del(quiosque.logoUrl).catch(() => {});
  }

  await prisma.quiosque.update({ where: { id: quiosque.id }, data: { logoUrl: null } });

  return NextResponse.json({ ok: true });
}
