import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { calcularAnalyticsEvento } from "@/lib/analytics";
import { PainelComOlho } from "@/components/PainelComOlho";
import { IconeModalidade } from "@/components/IconeModalidade";
import { LinkCopiavel } from "@/components/LinkCopiavel";
import { PausarEventoToggle } from "@/components/PausarEventoToggle";
import { ChatSuporte } from "@/components/ChatSuporte";
import { ExcluirEventoButton } from "@/components/ExcluirEventoButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SenhaOculta } from "@/components/SenhaOculta";
import { gerarQrCodeDataUrl } from "@/lib/qrcode";

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
  const evento = await prisma.evento.findFirst({
    where: { id: params.eventoId, organizadorId: obterOrganizadorId() },
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
  const linkCaixa = `${baseUrl}/caixa/${evento.id}/entrar`;
  const linkWebhook = `${baseUrl}/api/webhooks/mercado-pago`;
  const gateway = statusGateway();

  const [qrCliente, qrQuiosque, qrTelaDePedidos, qrCaixa] = await Promise.all([
    gerarQrCodeDataUrl(linkCliente),
    gerarQrCodeDataUrl(linkQuiosque),
    gerarQrCodeDataUrl(linkTelaDePedidos),
    gerarQrCodeDataUrl(linkCaixa),
  ]);

  return (
    <main className="tela tela-larga">
      <AutoRefresh />
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

      <PainelComOlho
        dados={dados}
        kpis={[
          { valor: formatarReais(dados.vendasTotal), rotulo: "Vendas do evento" },
          { valor: String(dados.totalPedidos), rotulo: "Pedidos", oculta: false },
          { valor: formatarReais(dados.vendasPorForma.mercadoPago), rotulo: "Via plataforma (split)" },
          { valor: formatarReais(dados.vendasPorForma.dinheiro), rotulo: "Em caixa (dinheiro)" },
        ]}
      >
        <Link
          href={`/gestor/eventos/${evento.id}/pedidos`}
          className="btn btn-secundario btn-bloco"
          style={{ marginBottom: 16 }}
        >
          📋 Registro de pedidos — conferir cliente por cliente
        </Link>
      </PainelComOlho>

      <div className="g-linha-cartoes">
        <div className="cartao" style={{ margin: 0 }}>
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

        <div className="g-sec" style={{ margin: 0 }}>
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

        <div className="cartao" style={{ margin: 0 }}>
          <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 12 }}>
            Links do evento
          </b>
          <LinkCopiavel rotulo="Link do cliente (QR Code / WhatsApp)" url={linkCliente} qrCodeDataUrl={qrCliente} />
          <LinkCopiavel
            rotulo="Login do painel do quiosque (mesmo link pra todos os quiosques)"
            url={linkQuiosque}
            qrCodeDataUrl={qrQuiosque}
          />
          <LinkCopiavel
            rotulo="Tela de Pedidos (telão, sem senha)"
            url={linkTelaDePedidos}
            qrCodeDataUrl={qrTelaDePedidos}
          />
          <LinkCopiavel
            rotulo="Venda Manual / Caixa do Evento (login do operador)"
            url={linkCaixa}
            qrCodeDataUrl={qrCaixa}
          />

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--linha)" }}>
            <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 12, fontSize: 13.5 }}>
              Senhas de acesso — pra passar pra equipe
            </b>
            <SenhaOculta rotulo="Senha do painel do quiosque" senha={process.env.PAINEL_QUIOSQUE_SENHA ?? "não configurada"} />
            <SenhaOculta rotulo="Senha do Caixa / Venda Manual" senha={process.env.PAINEL_CAIXA_SENHA ?? "não configurada"} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b style={{ fontFamily: "var(--font-sora)" }}>Quiosques</b>
        <Link href={`/gestor/eventos/${evento.id}/quiosques/novo`} className="btn btn-primario">
          + Quiosque
        </Link>
      </div>

      <div className="lista">
        {evento.quiosques.map((quiosque) => (
          <Link
            key={quiosque.id}
            href={`/gestor/eventos/${evento.id}/quiosques/${quiosque.id}`}
            className="cartao quiosque-card"
          >
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
            <div className="seta">›</div>
          </Link>
        ))}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}
      </div>

      <div className="g-sec" style={{ marginTop: 16 }}>
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12 }}>
          🆘 Suporte Cathan — canal direto
        </h5>
        <ChatSuporte
          apiUrl={`/api/eventos/${evento.id}/suporte`}
          remetente="GESTOR"
          placeholder="Descreva o problema — a equipe Cathan responde aqui"
          rotuloEnviar="Chamar suporte"
        />
      </div>

      <div className="g-sec" style={{ marginTop: 16 }}>
        <h5 style={{ fontFamily: "var(--font-sora)", marginBottom: 12, color: "#B4441C" }}>
          Zona de risco
        </h5>
        <ExcluirEventoButton eventoId={evento.id} eventoNome={evento.nome} />
      </div>
    </main>
  );
}
