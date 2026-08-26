import { put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  const corpo = await req.formData();
  const arquivo = corpo.get("imagem");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo de imagem em 'imagem'." }, { status: 400 });
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return NextResponse.json({ erro: "Formato inválido — use PNG, JPG ou WEBP." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande — máximo 5MB." }, { status: 400 });
  }

  if (quiosque.imagemFundoUrl) {
    await del(quiosque.imagemFundoUrl).catch(() => {});
  }

  const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`fundos-quiosque/${quiosque.id}-${Date.now()}.${extensao}`, arquivo, {
    access: "public",
  });

  await prisma.quiosque.update({ where: { id: quiosque.id }, data: { imagemFundoUrl: blob.url } });

  return NextResponse.json({ imagemFundoUrl: blob.url });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  if (quiosque.imagemFundoUrl) {
    await del(quiosque.imagemFundoUrl).catch(() => {});
  }

  await prisma.quiosque.update({ where: { id: quiosque.id }, data: { imagemFundoUrl: null } });

  return NextResponse.json({ ok: true });
}
