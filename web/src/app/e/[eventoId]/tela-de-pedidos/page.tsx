import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gerarQrCodeDataUrl } from "@/lib/qrcode";
import { TelaoPedidos } from "@/components/TelaoPedidos";

// Telão público (sem login): o servidor só resolve o nome do evento e o QR Code
// do link do cliente pra faixa inferior; os pedidos vêm por polling no client.
export default async function TelaDePedidos({ params }: { params: { eventoId: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.eventoId },
    select: { id: true, nome: true },
  });
  if (!evento) notFound();

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const qrCodeDataUrl = await gerarQrCodeDataUrl(`${baseUrl}/e/${evento.id}`);

  return <TelaoPedidos eventoId={evento.id} eventoNome={evento.nome} qrCodeDataUrl={qrCodeDataUrl} />;
}
