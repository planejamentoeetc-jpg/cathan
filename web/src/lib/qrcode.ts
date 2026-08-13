import QRCode from "qrcode";

// gera o QR code como data URI (PNG em base64) direto no servidor — evita carregar
// uma lib de QR code no navegador só pra isso.
export async function gerarQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 360,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
