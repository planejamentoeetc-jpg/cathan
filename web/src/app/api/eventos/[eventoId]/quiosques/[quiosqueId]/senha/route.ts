import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";

// Só o gestor (dono do evento) define/troca a senha própria de um quiosque
// INDEPENDENTE -- é ele quem repassa a senha pro responsável do restaurante.
export async function PUT(
  req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  if (quiosque.tipo !== "INDEPENDENTE") {
    return NextResponse.json(
      { erro: "Só quiosques independentes têm senha própria — quiosques do evento usam a senha geral." },
      { status: 400 }
    );
  }

  let corpo: { senha?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.senha || corpo.senha.length < 6) {
    return NextResponse.json({ erro: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(corpo.senha, 10);
  await prisma.quiosque.update({ where: { id: quiosque.id }, data: { senhaHash } });

  return NextResponse.json({ ok: true });
}

// Remove a senha própria -- o quiosque volta a valer a senha geral do evento
// (útil se o restaurante perder a senha e não tiver como o gestor recuperar
// a antiga, já que é armazenada só com hash).
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

  await prisma.quiosque.update({ where: { id: quiosque.id }, data: { senhaHash: null } });

  return NextResponse.json({ ok: true });
}
