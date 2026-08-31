import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assinarSessaoQuiosque } from "@/lib/sessaoQuiosque";

const COOKIE = "cathan_quiosque_auth";

export async function POST(req: NextRequest, { params }: { params: { quiosqueId: string } }) {
  const quiosque = await prisma.quiosque.findUnique({ where: { id: params.quiosqueId } });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }

  if (!quiosque.senhaHash) {
    return NextResponse.json(
      { erro: "Este quiosque ainda não teve uma senha própria definida pelo organizador." },
      { status: 400 }
    );
  }

  let corpo: { senha?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.senha) {
    return NextResponse.json({ erro: "Informe a senha." }, { status: 400 });
  }

  const senhaCorreta = await bcrypt.compare(corpo.senha, quiosque.senhaHash);
  if (!senhaCorreta) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const token = await assinarSessaoQuiosque(quiosque.id);

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h — turno de operação de um evento
  });
  return resposta;
}
