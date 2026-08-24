import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { DesconectarMercadoPagoButton } from "@/components/DesconectarMercadoPagoButton";

const MENSAGENS_ERRO: Record<string, string> = {
  recusado: "Você cancelou a autorização no Mercado Pago.",
  estado_invalido: "O link expirou ou é inválido — tente conectar de novo.",
  nao_configurado: "A integração com o Mercado Pago ainda não foi configurada no servidor.",
  falha_troca_token: "O Mercado Pago recusou a conexão. Tente novamente.",
  inesperado: "Erro inesperado ao conectar. Tente novamente.",
};

// sem cookies()/headers() explícito aqui, mas obterOrganizadorId() já lê
// headers() — isso já marca a rota como dinâmica sozinho, sem precisar do
// `export const dynamic` que as outras páginas do gestor usam por outro motivo
export default async function Conexoes({
  searchParams,
}: {
  searchParams: { conectado?: string; erro?: string };
}) {
  const organizador = await prisma.organizador.findUnique({
    where: { id: obterOrganizadorId() },
    select: { nome: true, mpUserId: true },
  });

  const conectado = Boolean(organizador?.mpUserId);

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
        <span>Conexões</span>
        <Link href="/gestor" style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Meus eventos
        </Link>
      </div>

      {searchParams.conectado && conectado && (
        <div
          className="aviso"
          style={{ marginBottom: 16, borderColor: "var(--verde)", background: "var(--verde-suave)", color: "var(--verde)" }}
        >
          ✓ Conta Mercado Pago conectada com sucesso!
        </div>
      )}
      {searchParams.erro && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          {MENSAGENS_ERRO[searchParams.erro] ?? "Não foi possível conectar."}
        </div>
      )}

      <div className="cartao">
        <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 8 }}>
          Mercado Pago
        </b>
        <p className="texto-fraco" style={{ marginBottom: 14 }}>
          Conecte sua própria conta Mercado Pago pra receber os pagamentos dos seus eventos
          diretamente na sua conta, com a comissão da Cathan descontada automaticamente em cada
          venda — sem precisar de acerto manual depois.
        </p>

        {conectado ? (
          <>
            <div className="g-row" style={{ marginBottom: 14 }}>
              Status
              <span className="val" style={{ color: "var(--verde)" }}>
                ✓ conectado
              </span>
            </div>
            <DesconectarMercadoPagoButton />
            <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
              Quer trocar pra outra conta depois de desconectar? O Mercado Pago reconecta
              automaticamente a mesma conta se você ainda estiver logado nela — saia da conta em{" "}
              <a href="https://www.mercadopago.com.br" target="_blank" rel="noopener noreferrer">
                mercadopago.com.br
              </a>{" "}
              antes de conectar a nova.
            </p>
          </>
        ) : (
          <>
            <div className="g-row" style={{ marginBottom: 14 }}>
              Status
              <span className="val" style={{ color: "var(--festa)" }}>
                não conectado
              </span>
            </div>
            <a href="/api/mercado-pago/oauth/iniciar" className="btn btn-primario btn-bloco">
              Conectar minha conta Mercado Pago
            </a>
            <p className="texto-fraco" style={{ marginTop: 10, fontSize: 12 }}>
              Vai usar uma conta diferente da última que você logou no Mercado Pago? Saia dela
              primeiro em{" "}
              <a href="https://www.mercadopago.com.br" target="_blank" rel="noopener noreferrer">
                mercadopago.com.br
              </a>
              , senão ele conecta a mesma de novo sem perguntar.
            </p>
          </>
        )}
      </div>

      <p className="texto-fraco" style={{ marginTop: 14, fontSize: 12.5 }}>
        Enquanto não conectar, os pagamentos dos seus eventos continuam caindo na conta padrão da
        Cathan, sem nenhuma mudança — conectar é totalmente opcional.
      </p>
    </main>
  );
}
