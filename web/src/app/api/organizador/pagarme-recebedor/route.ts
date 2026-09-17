import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { criarRecebedorIndividual, criarRecebedorRestaurante, type EnderecoRecebedor } from "@/lib/pagarMe";

type CorpoEndereco = {
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  pontoReferencia?: string;
};

type CorpoContaBancaria = {
  holderName?: string;
  holderType?: "individual" | "company";
  holderDocument?: string;
  banco?: string;
  agencia?: string;
  agenciaDigito?: string;
  conta?: string;
  contaDigito?: string;
  tipo?: "checking" | "savings";
};

type Corpo = {
  tipoRecebedor?: "corporation" | "individual";
  email?: string;
  cnpj?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  faturamentoAnual?: number;
  celularEmpresa?: string;
  enderecoEmpresa?: CorpoEndereco;
  representante?: {
    nome?: string;
    email?: string;
    cpf?: string;
    dataNascimento?: string;
    rendaMensal?: number;
    ocupacao?: string;
    celular?: string;
    endereco?: CorpoEndereco;
  };
  pessoa?: {
    nome?: string;
    email?: string;
    cpf?: string;
    dataNascimento?: string;
    rendaMensal?: number;
    ocupacao?: string;
    celular?: string;
    endereco?: CorpoEndereco;
  };
  contaBancaria?: CorpoContaBancaria;
};

function validarEndereco(e: CorpoEndereco | undefined, rotulo: string): EnderecoRecebedor {
  if (!e?.rua || !e.numero || !e.bairro || !e.cidade || !e.uf || !e.cep) {
    throw new Error(`Endereço ${rotulo} incompleto.`);
  }
  return {
    rua: e.rua.trim(),
    numero: e.numero.trim(),
    complemento: (e.complemento ?? "").trim() || "N/A",
    bairro: e.bairro.trim(),
    cidade: e.cidade.trim(),
    uf: e.uf.trim().toUpperCase(),
    cep: e.cep,
    pontoReferencia: (e.pontoReferencia ?? "").trim() || "N/A",
  };
}

function validarContaBancaria(c: CorpoContaBancaria | undefined) {
  if (
    !c?.holderName ||
    !c.holderType ||
    !c.holderDocument ||
    !c.banco ||
    !c.agencia ||
    !c.conta ||
    !c.contaDigito ||
    !c.tipo
  ) {
    throw new Error("Preencha todos os campos obrigatórios da conta bancária.");
  }
  return {
    holder_name: c.holderName.trim(),
    holder_type: c.holderType,
    holder_document: c.holderDocument.replace(/\D/g, ""),
    bank: c.banco.replace(/\D/g, ""),
    branch_number: c.agencia.replace(/\D/g, ""),
    branch_check_digit: (c.agenciaDigito ?? "").replace(/\D/g, "") || undefined,
    account_number: c.conta.replace(/\D/g, ""),
    account_check_digit: c.contaDigito.replace(/[^\dxX]/g, ""),
    type: c.tipo,
  };
}

// Cria o recebedor Pagar.me do organizador (recebe direto nos próprios eventos,
// sem restaurante independente envolvido) -- equivalente organizador do que
// pagarme-recebedor/route.ts já faz por quiosque. Só o próprio organizador
// logado, e só se ainda não tiver um recebedor.
export async function POST(req: NextRequest) {
  const organizador = await prisma.organizador.findUnique({ where: { id: obterOrganizadorId() } });
  if (!organizador) {
    return NextResponse.json({ erro: "Organizador não encontrado." }, { status: 404 });
  }
  if (organizador.pagarmeRecipientId) {
    return NextResponse.json({ erro: "Você já tem um recebedor Pagar.me." }, { status: 409 });
  }

  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  try {
    let recebedor;

    if (corpo.tipoRecebedor === "individual") {
      const p = corpo.pessoa;
      if (!p?.nome || !p.email || !p.cpf || !p.dataNascimento || !p.rendaMensal || !p.ocupacao || !p.celular) {
        return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
      }
      const endereco = validarEndereco(p.endereco, "do recebedor");
      const contaBancaria = validarContaBancaria(corpo.contaBancaria);

      recebedor = await criarRecebedorIndividual({
        email: p.email.trim(),
        cpf: p.cpf,
        nome: p.nome.trim(),
        dataNascimento: p.dataNascimento,
        rendaMensal: p.rendaMensal,
        ocupacao: p.ocupacao.trim(),
        celular: p.celular,
        endereco,
        contaBancaria,
        code: `organizador-${organizador.id}`,
      });
    } else {
      const r = corpo.representante;
      if (
        !corpo.email ||
        !corpo.cnpj ||
        !corpo.nomeFantasia ||
        !corpo.razaoSocial ||
        !corpo.faturamentoAnual ||
        !corpo.celularEmpresa ||
        !r?.nome ||
        !r.email ||
        !r.cpf ||
        !r.dataNascimento ||
        !r.rendaMensal ||
        !r.ocupacao ||
        !r.celular
      ) {
        return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
      }

      const enderecoEmpresa = validarEndereco(corpo.enderecoEmpresa, "da empresa");
      const enderecoRep = validarEndereco(r.endereco, "do representante");
      const contaBancaria = validarContaBancaria(corpo.contaBancaria);

      recebedor = await criarRecebedorRestaurante({
        email: corpo.email.trim(),
        cnpj: corpo.cnpj,
        nomeFantasia: corpo.nomeFantasia.trim(),
        razaoSocial: corpo.razaoSocial.trim(),
        faturamentoAnual: corpo.faturamentoAnual,
        celularEmpresa: corpo.celularEmpresa,
        enderecoEmpresa,
        representante: {
          nome: r.nome.trim(),
          email: r.email.trim(),
          cpf: r.cpf,
          dataNascimento: r.dataNascimento,
          rendaMensal: r.rendaMensal,
          ocupacao: r.ocupacao.trim(),
          celular: r.celular,
          endereco: enderecoRep,
        },
        contaBancaria,
        code: `organizador-${organizador.id}`,
      });
    }

    await prisma.organizador.update({
      where: { id: organizador.id },
      data: { pagarmeRecipientId: recebedor.id, pagarmeRecipientStatus: recebedor.status },
    });

    return NextResponse.json({ ok: true, recipientId: recebedor.id, status: recebedor.status });
  } catch (erro) {
    console.error("Falha ao criar recebedor Pagar.me do organizador", organizador.id, erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível criar o recebedor." },
      { status: 502 }
    );
  }
}
