import { NextRequest, NextResponse } from "next/server";
import { verificarSessaoGestor } from "@/lib/sessaoGestor";

const COOKIE_QUIOSQUE = "cathan_painel_auth";
const COOKIE_GESTOR = "cathan_gestor_auth";
const COOKIE_ADMIN = "cathan_admin_auth";
const COOKIE_CAIXA = "cathan_caixa_auth";
// header que carrega o organizadorId decodificado do JWT pro resto da requisição
// (Server Components/Route Handlers lêem via web/src/lib/organizadorAtual.ts)
const HEADER_ORGANIZADOR_ID = "x-organizador-id";

function autenticado(req: NextRequest, cookie: string, envVar: string): boolean {
  const senha = process.env[envVar];
  if (!senha) return false;
  return req.cookies.get(cookie)?.value === senha;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- área do gestor (eventos/quiosques do organizador + conexão Mercado Pago) ---
  if (
    pathname.startsWith("/gestor") ||
    pathname.startsWith("/api/eventos") ||
    pathname.startsWith("/api/mercado-pago")
  ) {
    const ehPaginaLoginGestor = pathname === "/gestor/entrar";
    // GET de tela-de-pedidos alimenta o telão público, visível a qualquer pessoa no evento
    const ehTelaDePedidosPublica = /^\/api\/eventos\/[^/]+\/tela-de-pedidos$/.test(pathname);
    // é o próprio Mercado Pago quem chama esse callback — não tem cookie de gestor
    // nessa requisição; a autenticidade vem do "state" assinado (ver a rota)
    const ehCallbackOauthPublico = pathname === "/api/mercado-pago/oauth/callback";

    if (ehPaginaLoginGestor || ehTelaDePedidosPublica || ehCallbackOauthPublico) {
      return NextResponse.next();
    }

    const organizadorId = await verificarSessaoGestor(req.cookies.get(COOKIE_GESTOR)?.value);
    if (organizadorId) {
      const headersComOrganizador = new Headers(req.headers);
      headersComOrganizador.set(HEADER_ORGANIZADOR_ID, organizadorId);
      return NextResponse.next({ request: { headers: headersComOrganizador } });
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const destino = new URL("/gestor/entrar", req.url);
    destino.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destino);
  }

  // --- Console Cathan (uso interno da equipe Cathan, não do gestor do evento) ---
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const ehPaginaLoginAdmin = pathname === "/admin/entrar";
    const ehApiAuthAdmin = pathname === "/api/admin/entrar" || pathname === "/api/admin/sair";

    if (ehPaginaLoginAdmin || ehApiAuthAdmin) {
      return NextResponse.next();
    }

    if (autenticado(req, COOKIE_ADMIN, "PAINEL_ADMIN_SENHA")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const destino = new URL("/admin/entrar", req.url);
    destino.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destino);
  }

  // --- Venda Manual / Caixa do Evento (operador autorizado do evento) ---
  if (pathname.startsWith("/caixa") || pathname.startsWith("/api/caixa")) {
    const ehPaginaLoginCaixa = /^\/caixa\/[^/]+\/entrar$/.test(pathname);
    const ehApiLoginCaixa = pathname === "/api/caixa/entrar";

    if (ehPaginaLoginCaixa || ehApiLoginCaixa) {
      return NextResponse.next();
    }

    if (autenticado(req, COOKIE_CAIXA, "PAINEL_CAIXA_SENHA")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const eventoId = pathname.split("/")[2] ?? "";
    const destino = new URL(`/caixa/${eventoId}/entrar`, req.url);
    destino.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destino);
  }

  // --- área do painel do quiosque ---

  // sem eventoId na URL (ex.: alguém acessou "/painel/entrar" direto, sem o
  // ID do evento) — não existe login "geral" do quiosque, cada evento tem o
  // seu; manda pro gestor achar o link certo em vez de um 404 confuso
  if (pathname === "/painel" || pathname === "/painel/" || pathname === "/painel/entrar") {
    return NextResponse.redirect(new URL("/gestor", req.url));
  }

  const ehPaginaLogin = /^\/painel\/[^/]+\/entrar$/.test(pathname);
  const ehApiLogin = pathname === "/api/painel/entrar";
  // chamado pelo cliente na tela de acompanhamento do próprio pedido (mesmo
  // modelo de segurança de GET /api/pedidos/[pedidoId] e .../liberar) — não é
  // uma ação de operador de quiosque, não pode exigir a senha do quiosque
  const ehClienteACaminhoPublico = /^\/api\/sub-pedidos\/[^/]+\/cliente-a-caminho$/.test(pathname);

  if (ehPaginaLogin || ehApiLogin || ehClienteACaminhoPublico) {
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
    "/admin/:path*",
    "/caixa/:path*",
    "/api/quiosques/:path*",
    "/api/sub-pedidos/:path*",
    "/api/produtos/:path*",
    "/api/eventos/:path*",
    "/api/admin/:path*",
    "/api/caixa/:path*",
    "/api/mercado-pago/:path*",
  ],
};
