import { NextResponse } from "next/server";

export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete("cathan_quiosque_auth");
  return resposta;
}
