// Se o checkout deste evento precisa pedir celular + CPF do cliente.
//
// O Pagar.me exige os dois do pagador em todo Pix; o Mercado Pago só precisa do
// nome. A rota de cada pedido é decidida por carrinho em decidirRota()
// (api/pedidos/route.ts) -- aqui a decisão é por evento, antes de saber o
// carrinho, então é conservadora: qualquer chance de cair no Pagar.me pede os
// dados. A API confere de novo depois de decidir a rota de verdade.
export function eventoPodeCobrarPeloPagarMe(evento: {
  modoDemonstracao: boolean;
  organizador: { pagarmeRecipientId: string | null; mpAccessTokenCifrado: string | null } | null;
  quiosques: { pagarmeRecipientId: string | null }[];
}): boolean {
  if (evento.modoDemonstracao) return false;
  if (evento.organizador?.pagarmeRecipientId) return true;
  if (evento.quiosques.some((q) => q.pagarmeRecipientId)) return true;
  // sem conexão Mercado Pago do organizador, o padrão de decidirRota() é o Pagar.me
  return !evento.organizador?.mpAccessTokenCifrado;
}
