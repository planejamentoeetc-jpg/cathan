// Integração de impressão térmica via Web Bluetooth (ESC/POS).
//
// ATENÇÃO: não foi possível testar isto de ponta a ponta neste ambiente de
// desenvolvimento — Web Bluetooth exige hardware real (impressora térmica BLE
// pareada) e só funciona em Chrome/Edge desktop ou Android (o Safari/iPhone
// não suporta a API). O tratamento de erro abaixo replica o que o protótipo
// HTML original fazia, mas só pode ser validado de verdade com a impressora
// em mãos.

const SERVICOS_CONHECIDOS = [
  "000018f0-0000-1000-8000-00805f9b34fb", // impressoras ESC/POS BLE (comum)
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Goojprt/POS genéricas
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC/Microchip transparente
  "0000ff00-0000-1000-8000-00805f9b34fb", // Xprinter/genéricas
  "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10/serial BLE
];

export class ErroImpressora extends Error {}

export type ConexaoImpressora = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
  semResposta: boolean;
};

export async function conectarImpressora(onDesconectar: () => void): Promise<ConexaoImpressora> {
  if (!navigator.bluetooth) {
    throw new ErroImpressora(
      "Este navegador não oferece Web Bluetooth. Use Chrome ou Edge no computador ou Android — o Safari/iPhone não suporta."
    );
  }

  if (navigator.bluetooth.getAvailability) {
    try {
      const disponivel = await navigator.bluetooth.getAvailability();
      if (!disponivel) {
        throw new ErroImpressora(
          "Bluetooth desligado ou bloqueado pelo sistema. Verifique se o Bluetooth do aparelho está ligado."
        );
      }
    } catch (e) {
      if (e instanceof ErroImpressora) throw e;
      // getAvailability pode falhar sem indicar bloqueio real — segue para a tentativa real
    }
  }

  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICOS_CONHECIDOS,
    });
  } catch (e) {
    const erro = e as Error;
    if (erro.name === "NotFoundError") {
      throw new ErroImpressora("Nenhum dispositivo selecionado.");
    }
    if (
      erro.name === "SecurityError" ||
      /permissions policy|globally disabled|access to the feature/i.test(erro.message ?? "")
    ) {
      throw new ErroImpressora(
        "O navegador bloqueou o Bluetooth nesta página. Abra o app direto no Chrome ou Edge, fora de um preview/iframe."
      );
    }
    throw new ErroImpressora(`Falha na conexão: ${erro.name ?? ""} — ${erro.message ?? erro}`);
  }

  const server = await device.gatt!.connect();
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  let semResposta = false;

  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.writeWithoutResponse) {
        characteristic = c;
        semResposta = true;
        break;
      }
      if (c.properties.write) {
        characteristic = c;
        semResposta = false;
      }
    }
    if (characteristic && semResposta) break;
  }

  if (!characteristic) {
    device.gatt?.disconnect();
    throw new ErroImpressora(
      "O dispositivo conectou, mas não expõe um canal de escrita BLE. Muitas térmicas antigas usam Bluetooth clássico (SPP), que o navegador não acessa."
    );
  }

  device.addEventListener("gattserverdisconnected", onDesconectar);

  return { device, characteristic, semResposta };
}

async function escrever(conexao: ConexaoImpressora, bytes: Uint8Array) {
  const TAMANHO_BLOCO = 100;
  for (let i = 0; i < bytes.length; i += TAMANHO_BLOCO) {
    const bloco = bytes.slice(i, i + TAMANHO_BLOCO);
    if (conexao.semResposta && conexao.characteristic.writeValueWithoutResponse) {
      await conexao.characteristic.writeValueWithoutResponse(bloco);
    } else {
      await conexao.characteristic.writeValue(bloco);
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

export type VendaParaImprimir = {
  eventoNome: string;
  eventoLocal: string;
  clienteNome: string;
  criadoEm: string;
  subPedidos: { codigoRetirada: string; quiosqueNome: string; itens: string[] }[];
};

export async function imprimirRecibo(conexao: ConexaoImpressora, venda: VendaParaImprimir) {
  const enc = new TextEncoder();
  const partes: number[] = [0x1b, 0x40, 0x1b, 0x61, 0x01];

  partes.push(
    ...enc.encode(
      `CATHAN\n${venda.eventoNome} - ${venda.eventoLocal}\n${venda.clienteNome} - ${new Date(
        venda.criadoEm
      ).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n`
    )
  );

  for (const sp of venda.subPedidos) {
    partes.push(
      ...enc.encode("--------------------------\n"),
      0x1d,
      0x21,
      0x22, // fonte gigante
      ...enc.encode(`${sp.codigoRetirada}\n`),
      0x1d,
      0x21,
      0x00, // fonte normal
      ...enc.encode(`Retirada: ${sp.quiosqueNome}\n${sp.itens.join("\n")}\n`)
    );
  }

  partes.push(
    ...enc.encode(
      `--------------------------\nPago em dinheiro - Caixa\n${
        venda.subPedidos.length > 1 ? "Uma retirada por quiosque\n" : ""
      }Acompanhe seus codigos na Tela de Pedidos\n\n\n`
    ),
    0x1d,
    0x56,
    0x00 // corte único no final
  );

  await escrever(conexao, new Uint8Array(partes));
}
