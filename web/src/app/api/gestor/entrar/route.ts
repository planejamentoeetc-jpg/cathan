import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assinarSessaoGestor } from "@/lib/sessaoGestor";

const COOKIE = "cathan_gestor_auth";

export async function POST(req: NextRequest) {
  let corpo: { email?: string; senha?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.email?.trim() || !corpo.senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const organizador = await prisma.organizador.findUnique({
    where: { email: corpo.email.trim().toLowerCase() },
  });
  if (!organizador) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const senhaCorreta = await bcrypt.compare(corpo.senha, organizador.senhaHash);
  if (!senhaCorreta) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const token = await assinarSessaoGestor(organizador.id);

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
