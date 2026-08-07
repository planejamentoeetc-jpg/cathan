import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioEvento } from "@/components/FormularioEvento";

// input datetime-local não entende fuso — formata em horário de Brasília,
// não UTC do servidor, senão a hora exibida fica errada pra quem edita.
function paraDatetimeLocal(data: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = formatter.formatToParts(data);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}T${valor("hour")}:${valor("minute")}`;
}

export default async function EditarEvento({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await prisma.evento.findUnique({ where: { id: params.eventoId } });
  if (!evento) notFound();

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
        <span>Editar evento</span>
        <Link href={`/gestor/eventos/${evento.id}`} style={{ fontSize: 12.5, color: "#BFD4DA" }}>
          Cancelar
        </Link>
      </div>

      <FormularioEvento
        eventoInicial={{
          id: evento.id,
          nome: evento.nome,
          local: evento.local,
          data: paraDatetimeLocal(evento.data),
          raioPedidosMetros: evento.raioPedidosMetros,
          latitude: evento.latitude,
          longitude: evento.longitude,
        }}
      />
    </main>
  );
}
