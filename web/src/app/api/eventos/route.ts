import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CorpoRequisicao = {
  nome: string;
  local: string;
  data: string;
  raioPedidosMetros?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function POST(req: NextRequest) {
  let corpo: CorpoRequisicao;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.nome?.trim() || !corpo.local?.trim() || !corpo.data) {
    return NextResponse.json({ erro: "Informe nome, local e data do evento." }, { status: 400 });
  }

  const data = new Date(corpo.data);
  if (Number.isNaN(data.getTime())) {
    return NextResponse.json({ erro: "Data do evento inválida." }, { status: 400 });
  }

  // geofencing é tudo-ou-nada: raio junto com lat/long, ou nenhum dos três (ver CHECK no banco)
  const temRaio = corpo.raioPedidosMetros !== null && corpo.raioPedidosMetros !== undefined;
  const temCoordenadas =
    typeof corpo.latitude === "number" && typeof corpo.longitude === "number";

  if (temRaio !== temCoordenadas) {
    return NextResponse.json(
      { erro: "Raio de geofencing e localização (latitude/longitude) devem ser definidos juntos." },
      { status: 400 }
    );
  }
  if (temRaio && (!Number.isInteger(corpo.raioPedidosMetros) || (corpo.raioPedidosMetros as number) <= 0)) {
    return NextResponse.json({ erro: "Raio de geofencing deve ser um número inteiro maior que zero." }, { status: 400 });
  }

  const evento = await prisma.evento.create({
    data: {
      nome: corpo.nome.trim(),
      local: corpo.local.trim(),
      data,
      raioPedidosMetros: temRaio ? (corpo.raioPedidosMetros as number) : null,
      latitude: temCoordenadas ? (corpo.latitude as number) : null,
      longitude: temCoordenadas ? (corpo.longitude as number) : null,
    },
  });

  return NextResponse.json({ id: evento.id }, { status: 201 });
}
