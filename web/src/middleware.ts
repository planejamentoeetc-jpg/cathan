import { NextRequest, NextResponse } from "next/server";
import { verificarSessaoGestor } from "@/lib/sessaoGestor";
import { verificarSessaoQuiosque } from "@/lib/sessaoQuiosque";

const COOKIE_QUIOSQUE = "cathan_painel_auth";
// sessão própria de um quiosque INDEPENDENTE (senha dele, não a senha geral do
// evento) -- ver lib/sessaoQuiosque.ts
const COOKIE_QUIOSQUE_PROPRIO = "cathan_quiosque_auth";
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
  // login/logout do quiosque INDEPENDENTE com senha própria (ver .../entrar
  // e lib/sessaoQuiosque.ts) — precisam ficar públicos como os equivalentes acima
  const ehPaginaLoginQuiosqueProprio = /^\/painel\/[^/]+\/q\/[^/]+\/entrar$/.test(pathname);
  const ehApiLoginOuSairQuiosqueProprio = /^\/api\/quiosques\/[^/]+\/(entrar|sair)$/.test(pathname);

  if (
    ehPaginaLogin ||
    ehApiLogin ||
    ehClienteACaminhoPublico ||
    ehPaginaLoginQuiosqueProprio ||
    ehApiLoginOuSairQuiosqueProprio
  ) {
    return NextResponse.next();
  }

  if (autenticado(req, COOKIE_QUIOSQUE, "PAINEL_QUIOSQUE_SENHA")) {
    return NextResponse.next();
  }

  // sessão própria de um quiosque INDEPENDENTE — extrai o quiosqueId tanto de
  // /painel/{eventoId}/q/{quiosqueId}/... quanto de /api/quiosques/{quiosqueId}/...
  // e só deixa passar se bater com o quiosqueId assinado na sessão. Isso
  // impede que a sessão de um restaurante abra o painel de outro. A checagem
  // de SE este quiosque específico realmente exige senha própria (tipo
  // INDEPENDENTE com senha definida) mora na própria página/rota — aqui no
  // middleware (Edge runtime) só dá pra validar a assinatura do token, não
  // consultar o Prisma.
  const quiosqueIdDaUrl =
    pathname.match(/^\/painel\/[^/]+\/q\/([^/]+)/)?.[1] ?? pathname.match(/^\/api\/quiosques\/([^/]+)/)?.[1];

  const quiosqueIdSessao = await verificarSessaoQuiosque(req.cookies.get(COOKIE_QUIOSQUE_PROPRIO)?.value);
  if (quiosqueIdSessao) {
    // URLs sem quiosqueId explícito (ex.: /api/produtos/{produtoId}, que só
    // referencia o produto) deixam passar com qualquer sessão de quiosque
    // válida — a posse real (esse produto é mesmo deste quiosque?) é
    // conferida na própria rota via verificarAcessoQuiosqueApi, que tem
    // acesso ao Prisma pra buscar o quiosque dono do produto.
    if (!quiosqueIdDaUrl || quiosqueIdSessao === quiosqueIdDaUrl) {
      return NextResponse.next();
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  // URL já era de um quiosque específico — manda pro login DELE, não pro
  // login geral do evento
  const eventoIdDoQuiosque = pathname.match(/^\/painel\/([^/]+)\/q\//)?.[1];
  if (quiosqueIdDaUrl && eventoIdDoQuiosque) {
    const destinoQuiosque = new URL(
      `/painel/${eventoIdDoQuiosque}/q/${quiosqueIdDaUrl}/entrar`,
      req.url
    );
    destinoQuiosque.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destinoQuiosque);
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
