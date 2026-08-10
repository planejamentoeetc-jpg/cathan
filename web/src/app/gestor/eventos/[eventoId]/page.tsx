import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularAnalyticsEvento } from "@/lib/analytics";
import { AnalisesEvento } from "@/components/AnalisesEvento";
import { IconeModalidade } from "@/components/IconeModalidade";
import { LinkCopiavel } from "@/components/LinkCopiavel";
import { PausarEventoToggle } from "@/components/PausarEventoToggle";

const NOME_MODALIDADE: Record<string, string> = {
  ALIMENTACAO: "Alimentação",
  BEBIDAS: "Bebidas",
  BRINCADEIRAS: "Brincadeiras",
};

function formatarData(data: Date) {
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// leitura só de presença/prefixo — não instancia o client real do Mercado Pago
// (lib/mercadoPago.ts lança erro se MP_ACCESS_TOKEN faltar, o que derrubaria essa página à toa)
function statusGateway() {
  const token = process.env.MP_ACCESS_TOKEN;
  return {
    conectado: Boolean(token),
    ambiente: token?.startsWith("TEST-") ? "Sandbox" : "Produção",
  };
}

export default async function EventoGestor({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: {
      quiosques: {
        orderBy: { nome: "asc" },
        include: { _count: { select: { produtos: true } } },
      },
    },
  });

  if (!evento) notFound();

  const dados = await calcularAnalyticsEvento(evento.id);

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const linkCliente = `${baseUrl}/e/${evento.id}`;
  const linkQuiosque = `${baseUrl}/painel/${evento.id}/entrar`;
  const linkTelaDePedidos = `${baseUrl}/e/${evento.id}/tela-de-pedidos`;
  const linkWebhook = `${baseUrl}/api/webhooks/mercado-pago`;
  const gateway = statusGateway();

  return (
    <main className="tela">
      <div
        className="topo"
        style={{
          borderRadius: 18,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{evento.nome}</span>
        <Link href="/gestor" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Meus eventos
        </Link>
      </div>

      <PausarEventoToggle eventoId={evento.id} pausadoInicial={evento.pedidosPausados} />

      <div className="g-grid">
        <div className="kpi">
          <div className="n">{formatarReais(dados.vendasTotal)}</div>
          <div className="l">Vendas do evento</div>
        </div>
        <div className="kpi">
          <div className="n">{dados.totalPedidos}</div>
          <div className="l">Pedidos</div>
        </div>
        <div className="kpi">
          <div className="n">{formatarReais(dados.vendasPorForma.mercadoPago)}</div>
          <div className="l">Via plataforma (split)</div>
        </div>
        <div className="kpi">
          <div className="n">{formatarReais(dados.vendasPorForma.dinheiro)}</div>
          <div className="l">Em caixa (dinheiro)</div>
        </div>
      </div>

      <AnalisesEvento dados={dados} />

      <div className="cartao" style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 6 }}>
          <b>Local:</b> {evento.local}
        </p>
        <p style={{ marginBottom: 6 }}>
          <b>Data:</b> {formatarData(evento.data)}
        </p>
        <p style={{ marginBottom: 12 }}>
          <b>Geofencing:</b>{" "}
          {evento.raioPedidosMetros !== null
            ? `raio de ${evento.raioPedidosMetros}m`
            : "não aplicável"}
        </p>
        <Link href={`/gestor/eventos/${evento.id}/editar`} className="btn btn-secundario btn-bloco">
          Editar evento / recalibrar raio
        </Link>
      </div>

      <div className="g-sec">
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 4 }}>💳 Configurações de pagamento</h5>
        <div className="g-row">
          Gateway
          <span className="val" style={{ fontFamily: "var(--font-manrope)" }}>
            Mercado Pago
          </span>
        </div>
        <div className="g-row">
          Ambiente
          <span className="val" style={{ fontFamily: "var(--font-manrope)" }}>
            {gateway.ambiente}
          </span>
        </div>
        <div className="g-row">
          Status
          <span className="val" style={{ color: gateway.conectado ? "var(--verde)" : "var(--festa)" }}>
            {gateway.conectado ? "✓ conectado" : "não conectado"}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <LinkCopiavel rotulo="URL de webhook (configurada no painel do Mercado Pago)" url={linkWebhook} />
        </div>
        <p className="texto-fraco" style={{ marginTop: 10 }}>
          Hoje é uma conta única (a do evento/Cathan) — sem split automático por quiosque ainda,
          essa é a próxima etapa no roadmap de pagamentos.
        </p>
        <div className="aviso" style={{ marginTop: 10 }}>
          <b>Regra de ouro:</b> a chave secreta (Access Token) nunca fica no navegador — ela vive
          só nas variáveis de ambiente do servidor. O que aparece aqui é só informação pública de
          status.
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 16 }}>
        <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 12 }}>
          Links do evento
        </b>
        <LinkCopiavel rotulo="Link do cliente (QR Code / WhatsApp)" url={linkCliente} />
        <LinkCopiavel rotulo="Login do painel do quiosque (mesmo link pra todos os quiosques)" url={linkQuiosque} />
        <LinkCopiavel rotulo="Tela de Pedidos (telão, sem senha)" url={linkTelaDePedidos} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b style={{ fontFamily: "var(--font-sora)" }}>Quiosques</b>
        <Link href={`/gestor/eventos/${evento.id}/quiosques/novo`} className="btn btn-primario">
          + Quiosque
        </Link>
      </div>

      <div className="lista">
        {evento.quiosques.map((quiosque) => (
          <div key={quiosque.id} className="cartao quiosque-card">
            <div className="quiosque-logo" style={{ background: quiosque.cor }}>
              <IconeModalidade modalidade={quiosque.modalidade} />
            </div>
            <div style={{ flex: 1 }}>
              <b>{quiosque.nome}</b>
              <div className="texto-fraco">{NOME_MODALIDADE[quiosque.modalidade]}</div>
              {quiosque.tipo === "INDEPENDENTE" ? (
                <div style={{ fontSize: 11.5, color: "var(--verde)", fontWeight: 700, marginTop: 2 }}>
                  🏢 Independente · PIX {quiosque.chavePix}
                </div>
              ) : (
                <div className="texto-fraco" style={{ fontSize: 11.5, marginTop: 2 }}>
                  Do evento · recebe na conta do organizador
                </div>
              )}
            </div>
            {quiosque._count.produtos === 0 ? (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#B4441C" }}>⚠ sem produtos ainda</span>
            ) : (
              <span className="texto-fraco" style={{ fontSize: 12 }}>
                {quiosque._count.produtos} produto{quiosque._count.produtos === 1 ? "" : "s"}
              </span>
            )}
          </div>
        ))}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}
      </div>
    </main>
  );
}
