import { NextRequest, NextResponse } from "next/server";

const COOKIE = "cathan_admin_auth";

export async function POST(req: NextRequest) {
  const senhaEsperada = process.env.PAINEL_ADMIN_SENHA;
  if (!senhaEsperada) {
    return NextResponse.json(
      { erro: "PAINEL_ADMIN_SENHA não configurada no servidor." },
      { status: 500 }
    );
  }

  let corpo: { senha?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (corpo.senha !== senhaEsperada) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE, senhaEsperada, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return resposta;
}
