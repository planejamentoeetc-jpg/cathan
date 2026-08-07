import { NextRequest, NextResponse } from "next/server";

const COOKIE_QUIOSQUE = "cathan_painel_auth";
const COOKIE_GESTOR = "cathan_gestor_auth";

function autenticado(req: NextRequest, cookie: string, envVar: string): boolean {
  const senha = process.env[envVar];
  if (!senha) return false;
  return req.cookies.get(cookie)?.value === senha;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- área do gestor (criação de evento/quiosques) ---
  if (pathname.startsWith("/gestor") || pathname.startsWith("/api/eventos")) {
    const ehPaginaLoginGestor = pathname === "/gestor/entrar";
    // GET de tela-de-pedidos alimenta o telão público, visível a qualquer pessoa no evento
    const ehTelaDePedidosPublica = /^\/api\/eventos\/[^/]+\/tela-de-pedidos$/.test(pathname);

    if (ehPaginaLoginGestor || ehTelaDePedidosPublica) {
      return NextResponse.next();
    }

    if (autenticado(req, COOKIE_GESTOR, "PAINEL_GESTOR_SENHA")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const destino = new URL("/gestor/entrar", req.url);
    destino.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destino);
  }

  // --- área do painel do quiosque ---
  const ehPaginaLogin = /^\/painel\/[^/]+\/entrar$/.test(pathname);
  const ehApiLogin = pathname === "/api/painel/entrar";

  if (ehPaginaLogin || ehApiLogin) {
    return NextResponse.next();
  }

  if (autenticado(req, COOKIE_QUIOSQUE, "PAINEL_QUIOSQUE_SENHA")) {
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
    "/gestor/:path*",
    "/api/quiosques/:path*",
    "/api/sub-pedidos/:path*",
    "/api/produtos/:path*",
    "/api/eventos/:path*",
  ],
};
