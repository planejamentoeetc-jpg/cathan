"use client";

const PREFIXO = "cathan:pix-pendente:";

export type PixPendenteLocal = {
  pedidoPendenteId: string;
  copiaECola: string;
  qrCodeBase64: string;
  valor: number;
  // presente só depois que o pagamento é confirmado — permite reabrir direto na
  // tela de "pagamento confirmado" se a aba recarregar antes do cliente tocar
  // no botão de ir pro acompanhamento
  pedidoId?: string;
};

// Persiste o Pix em andamento pra sobreviver a um reload da aba — muito comum nesse
// fluxo, já que o cliente sai do navegador pra pagar no app do banco, e o Android em
// especial costuma descartar/recarregar abas em segundo plano por pressão de memória.
// Sem isso, o cliente volta pro checkout do zero (carrinho já vazio, sem como saber
// que já pagou) mesmo com o pagamento confirmado no servidor.
export function lerPixPendente(eventoId: string): PixPendenteLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(PREFIXO + eventoId);
    return bruto ? (JSON.parse(bruto) as PixPendenteLocal) : null;
  } catch {
    return null;
  }
}

export function salvarPixPendente(eventoId: string, dados: PixPendenteLocal) {
  window.localStorage.setItem(PREFIXO + eventoId, JSON.stringify(dados));
}

export function limparPixPendente(eventoId: string) {
  window.localStorage.removeItem(PREFIXO + eventoId);
}
