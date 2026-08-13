import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const EMAIL_BOOTSTRAP = "equipe@cathan.com.br";
const NOME_BOOTSTRAP = "Cathan — eventos próprios";

async function main() {
  const senhaAtual = process.env.PAINEL_GESTOR_SENHA;
  if (!senhaAtual) {
    throw new Error("PAINEL_GESTOR_SENHA não configurada — rode isso com o mesmo .env do servidor.");
  }

  const existente = await prisma.organizador.findUnique({ where: { email: EMAIL_BOOTSTRAP } });
  if (existente) {
    console.log(`Organizador bootstrap já existe (id ${existente.id}). Nada a fazer.`);
    return;
  }

  const senhaHash = await bcrypt.hash(senhaAtual, 10);

  const organizador = await prisma.organizador.create({
    data: { nome: NOME_BOOTSTRAP, email: EMAIL_BOOTSTRAP, senhaHash },
  });

  const resultado = await prisma.evento.updateMany({
    where: { organizadorId: null },
    data: { organizadorId: organizador.id },
  });

  console.log(`Organizador bootstrap criado: ${organizador.id}`);
  console.log(`Login: ${EMAIL_BOOTSTRAP} / (mesma senha que já era o PAINEL_GESTOR_SENHA)`);
  console.log(`${resultado.count} evento(s) associado(s) a ele.`);
}

main().finally(() => prisma.$disconnect());
