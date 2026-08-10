import { NextResponse } from "next/server";

export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete("cathan_admin_auth");
  return resposta;
}
