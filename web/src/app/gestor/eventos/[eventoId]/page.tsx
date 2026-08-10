import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

export default async function EventoGestor({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    include: { quiosques: { orderBy: { nome: "asc" } } },
  });

  if (!evento) notFound();

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const linkCliente = `${baseUrl}/e/${evento.id}`;
  const linkQuiosque = `${baseUrl}/painel/${evento.id}/entrar`;
  const linkTelaDePedidos = `${baseUrl}/e/${evento.id}/tela-de-pedidos`;

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
            <div>
              <b>{quiosque.nome}</b>
              <div className="texto-fraco">{NOME_MODALIDADE[quiosque.modalidade]}</div>
            </div>
          </div>
        ))}

        {evento.quiosques.length === 0 && (
          <p className="texto-fraco">Nenhum quiosque cadastrado neste evento ainda.</p>
        )}
      </div>
    </main>
  );
}
