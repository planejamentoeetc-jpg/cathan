import { ModalidadeQuiosque, PrismaClient, TipoQuiosque } from "@prisma/client";

const prisma = new PrismaClient();

// Idempotente: roda de novo sem duplicar nem apagar pedidos de teste já criados
// (Evento tem FK RESTRICT contra Pedido, então não tentamos deletar/recriar).
async function main() {
  const existente = await prisma.evento.findFirst({ where: { nome: "Festa Junina — Escola Terezinha" } });
  if (existente) {
    console.log(`Evento de teste já existe: ${existente.id}`);
    console.log(`Acesse: http://localhost:3000/e/${existente.id}`);
    return;
  }

  const evento = await prisma.evento.create({
    data: {
      nome: "Festa Junina — Escola Terezinha",
      local: "Escola Terezinha, São Paulo - SP",
      data: new Date("2026-08-15T18:00:00-03:00"),
      raioPedidosMetros: 300,
      // Praça da Sé, SP — só para teste; ajuste para a localização real do evento
      latitude: -23.5505,
      longitude: -46.6333,
      quiosques: {
        create: [
          {
            nome: "Barraca da Pipoca",
            modalidade: ModalidadeQuiosque.ALIMENTACAO,
            cor: "#FFB94A",
            tipo: TipoQuiosque.DO_EVENTO,
            produtos: {
              create: [
                { nome: "Pipoca Doce", preco: 5, tempoProducaoMinutos: 5, estoque: 50 },
                { nome: "Pipoca Salgada", preco: 5, tempoProducaoMinutos: 5, estoque: null },
              ],
            },
          },
          {
            nome: "Bebidas Geladas",
            modalidade: ModalidadeQuiosque.BEBIDAS,
            cor: "#1E8E5A",
            tipo: TipoQuiosque.DO_EVENTO,
            produtos: {
              create: [
                { nome: "Água mineral", preco: 3, tempoProducaoMinutos: 0, estoque: 100 },
                { nome: "Refrigerante lata", preco: 6, tempoProducaoMinutos: 0, estoque: 80 },
              ],
            },
          },
          {
            nome: "Pula-Pula",
            modalidade: ModalidadeQuiosque.BRINCADEIRAS,
            cor: "#FF7A45",
            tipo: TipoQuiosque.DO_EVENTO,
            produtos: {
              create: [
                { nome: "Ingresso Pula-Pula (15 min)", preco: 10, tempoProducaoMinutos: 15, estoque: null },
              ],
            },
          },
        ],
      },
    },
  });

  const eventoSemGeofencing = await prisma.evento.create({
    data: {
      nome: "Feira de Adoção do Bairro",
      local: "Praça Central",
      data: new Date("2026-08-22T10:00:00-03:00"),
      raioPedidosMetros: null,
      quiosques: {
        create: [
          {
            nome: "Cantina Solidária",
            modalidade: ModalidadeQuiosque.ALIMENTACAO,
            cor: "#16333D",
            tipo: TipoQuiosque.DO_EVENTO,
            produtos: {
              create: [{ nome: "Cachorro-quente", preco: 8, tempoProducaoMinutos: 8, estoque: 40 }],
            },
          },
        ],
      },
    },
  });

  console.log("Seed criado com sucesso:");
  console.log(`- Com geofencing:  http://localhost:3000/e/${evento.id}`);
  console.log(`- Sem geofencing:  http://localhost:3000/e/${eventoSemGeofencing.id}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
