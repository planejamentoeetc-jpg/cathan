import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterOrganizadorId } from "@/lib/organizadorAtual";
import { criarRecebedorRestaurante, type EnderecoRecebedor } from "@/lib/pagarMe";

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

type Corpo = {
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
  contaBancaria?: {
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

// Cria o recebedor Pagar.me do restaurante (split N:1). Só o gestor dono do
// evento pode fazer isso, e só pra quiosque INDEPENDENTE que ainda não tem
// recebedor. O KYC completo é preenchido pelo gestor junto com o responsável
// do restaurante -- diferente do Mercado Pago (um clique de OAuth), o Pagar.me
// precisa de dados cadastrais + representante legal + conta bancária.
export async function POST(
  req: NextRequest,
  { params }: { params: { eventoId: string; quiosqueId: string } }
) {
  const quiosque = await prisma.quiosque.findFirst({
    where: { id: params.quiosqueId, eventoId: params.eventoId, evento: { organizadorId: obterOrganizadorId() } },
  });
  if (!quiosque) {
    return NextResponse.json({ erro: "Quiosque não encontrado." }, { status: 404 });
  }
  if (quiosque.tipo !== "INDEPENDENTE") {
    return NextResponse.json({ erro: "Só quiosques independentes têm recebimento próprio." }, { status: 400 });
  }
  if (quiosque.pagarmeRecipientId) {
    return NextResponse.json({ erro: "Este restaurante já tem um recebedor Pagar.me." }, { status: 409 });
  }

  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const c = corpo.contaBancaria;
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
    !r.celular ||
    !c?.holderName ||
    !c.holderType ||
    !c.holderDocument ||
    !c.banco ||
    !c.agencia ||
    !c.conta ||
    !c.contaDigito ||
    !c.tipo
  ) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  let enderecoEmpresa: EnderecoRecebedor;
  let enderecoRep: EnderecoRecebedor;
  try {
    enderecoEmpresa = validarEndereco(corpo.enderecoEmpresa, "da empresa");
    enderecoRep = validarEndereco(r.endereco, "do representante");
  } catch (erro) {
    return NextResponse.json({ erro: erro instanceof Error ? erro.message : "Endereço inválido." }, { status: 400 });
  }

  try {
    const recebedor = await criarRecebedorRestaurante({
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
      contaBancaria: {
        holder_name: c.holderName.trim(),
        holder_type: c.holderType,
        holder_document: c.holderDocument.replace(/\D/g, ""),
        bank: c.banco.replace(/\D/g, ""),
        branch_number: c.agencia.replace(/\D/g, ""),
        branch_check_digit: (c.agenciaDigito ?? "").replace(/\D/g, "") || undefined,
        account_number: c.conta.replace(/\D/g, ""),
        account_check_digit: c.contaDigito.replace(/[^\dxX]/g, ""),
        type: c.tipo,
      },
      code: `quiosque-${quiosque.id}`,
    });

    await prisma.quiosque.update({
      where: { id: quiosque.id },
      data: { pagarmeRecipientId: recebedor.id, pagarmeRecipientStatus: recebedor.status },
    });

    return NextResponse.json({ ok: true, recipientId: recebedor.id, status: recebedor.status });
  } catch (erro) {
    console.error("Falha ao criar recebedor Pagar.me", quiosque.id, erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não foi possível criar o recebedor." },
      { status: 502 }
    );
  }
}
