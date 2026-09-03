import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota temporária, só pra criar os dados do teste real de retenção de
// application_fee na modalidade organizador único (ver memória
// cathan-split-payment-status). Protegida pelo mesmo middleware admin de
// sempre (/api/admin/:path*). Apaga esse arquivo depois de usar.
export async function GET() {
  const senhaHash = await bcrypt.hash("teste123", 10);
  const organizador = await prisma.organizador.create({
    data: {
      nome: "TESTE comissao MP (apagar)",
      email: "teste-comissao-mp@cathan.com.br",
      senhaHash,
    },
  });
  const evento = await prisma.evento.create({
    data: {
      nome: "TESTE comissao MP (apagar)",
      local: "Teste",
      data: new Date(),
      modalidade: "ORGANIZADOR_UNICO",
      comissaoPercentual: 10,
      organizadorId: organizador.id,
    },
  });
  const quiosque = await prisma.quiosque.create({
    data: { nome: "Teste", eventoId: evento.id, tipo: "DO_EVENTO", modalidade: "ALIMENTACAO", cor: "#1e8e5a" },
  });
  const produto = await prisma.produto.create({
    data: { quiosqueId: quiosque.id, nome: "Item de teste R$2", preco: 2, tempoProducaoMinutos: 0, estoque: null },
  });

  return NextResponse.json({
    organizadorId: organizador.id,
    email: organizador.email,
    senha: "teste123",
    eventoId: evento.id,
    quiosqueId: quiosque.id,
    produtoId: produto.id,
  });
}
