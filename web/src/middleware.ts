import { NextRequest, NextResponse } from "next/server";

const COOKIE = "cathan_painel_auth";

function autenticado(req: NextRequest): boolean {
  const senha = process.env.PAINEL_QUIOSQUE_SENHA;
  if (!senha) return false;
  return req.cookies.get(COOKIE)?.value === senha;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const ehPaginaLogin = /^\/painel\/[^/]+\/entrar$/.test(pathname);
  const ehApiLogin = pathname === "/api/painel/entrar";

  if (ehPaginaLogin || ehApiLogin) {
    return NextResponse.next();
  }

  if (autenticado(req)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const eventoId = pathname.split("/")[2] ?? "";
  const destino = new URL(`/painel/${eventoId}/entrar`, req.url);
  destino.searchParams.set("redirect", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: [
    "/painel/:path*",
    "/api/quiosques/:path*",
    "/api/sub-pedidos/:path*",
    "/api/produtos/:path*",
  ],
};
