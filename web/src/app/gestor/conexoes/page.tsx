import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { DesconectarMercadoPagoButton } from "@/components/DesconectarMercadoPagoButton";
import { ConectarPagarMeQuiosque } from "@/components/ConectarPagarMeQuiosque";

// sem cookies()/headers() explícito aqui, mas obterOrganizadorId() já lê
// headers() — isso já marca a rota como dinâmica sozinho, sem precisar do
// `export const dynamic` que as outras páginas do gestor usam por outro motivo
export default async function Conexoes() {
  const organizador = await prisma.organizador.findUnique({
    where: { id: obterOrganizadorId() },
    select: { nome: true, mpUserId: true, pagarmeRecipientId: true, pagarmeRecipientStatus: true },
  });

  const conectadoMp = Boolean(organizador?.mpUserId);

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

      <div className="cartao" style={{ marginBottom: 16 }}>
        <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 8 }}>
          💠 Pagar.me
        </b>
        <p className="texto-fraco" style={{ marginBottom: 14 }}>
          É o recebedor oficial da Cathan: você recebe direto nos seus eventos, com a comissão
          descontada automaticamente em cada venda, sem acerto manual depois.
        </p>
        <ConectarPagarMeQuiosque
          apiUrl="/api/organizador/pagarme-recebedor"
          jaConectado={Boolean(organizador?.pagarmeRecipientId)}
          statusInicial={organizador?.pagarmeRecipientStatus ?? null}
          cnpjInicial=""
          nomeInicial={organizador?.nome ?? ""}
          descricao="Esses dados vão pro Pagar.me criar o recebedor que recebe seus pagamentos direto, com a comissão da Cathan descontada automaticamente."
        />
      </div>

      {conectadoMp && (
        <div className="cartao">
          <b style={{ fontFamily: "var(--font-sora)", display: "block", marginBottom: 8 }}>
            Mercado Pago <span className="texto-fraco" style={{ fontWeight: 400 }}>(legado)</span>
          </b>
          <p className="texto-fraco" style={{ marginBottom: 14 }}>
            Só existe pra quem já conectou antes de o Pagar.me virar o recebedor oficial. Cadastre
            o Pagar.me acima pra centralizar tudo num recebedor só.
          </p>
          <div className="g-row" style={{ marginBottom: 14 }}>
            Status
            <span className="val" style={{ color: "var(--verde)" }}>
              ✓ conectado
            </span>
          </div>
          <DesconectarMercadoPagoButton />
        </div>
      )}

      <p className="texto-fraco" style={{ marginTop: 14, fontSize: 12.5 }}>
        Enquanto não conectar nenhum recebedor, os pagamentos dos seus eventos continuam caindo na
        conta padrão da Cathan, sem nenhuma mudança — conectar é totalmente opcional.
      </p>
    </main>
  );
}
