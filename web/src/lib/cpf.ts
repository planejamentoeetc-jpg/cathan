// Validação de CPF (dígitos verificadores) -- usada tanto no checkout do
// cliente (CheckoutForm) quanto no servidor (POST /api/pedidos), já que o
// Pagar.me exige um documento do comprador em todo pedido (ver
// cathan_baas_provider_decision na memória do projeto).
export function validarCpf(valor: string): boolean {
  const cpf = valor.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  function digitoVerificador(base: string): number {
    const pesoInicial = base.length + 1;
    const soma = base
      .split("")
      .reduce((acumulado, digito, indice) => acumulado + Number(digito) * (pesoInicial - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  const primeiroDigito = digitoVerificador(cpf.slice(0, 9));
  const segundoDigito = digitoVerificador(cpf.slice(0, 9) + primeiroDigito);
  return cpf === cpf.slice(0, 9) + String(primeiroDigito) + String(segundoDigito);
}

export function formatarCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
