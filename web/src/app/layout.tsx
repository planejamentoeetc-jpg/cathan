import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Poppins } from "next/font/google";
import "./globals.css";

// Poppins é a tipografia oficial da marca (guideline) -- mantém o nome da
// variável CSS antiga (--font-sora) pra não ter que mexer em cada tela.
const sora = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora" });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://app.cathan.com.br"),
  title: { default: "cathan", template: "%s | cathan" },
  description: "Viva o momento. Nós cuidamos do resto. O balcão digital do seu evento.",
  applicationName: "cathan",
  appleWebApp: { capable: true, title: "cathan", statusBarStyle: "default" },
  openGraph: {
    siteName: "cathan",
    title: "cathan",
    description: "Viva o momento. Nós cuidamos do resto.",
    locale: "pt_BR",
    type: "website",
  },
};

// sem isso, o Next só injeta o viewport padrão (sem travar o zoom) — no celular,
// um pinch-zoom acidental numa tela "vaza" pro client-side routing do Next.js
// (não é um reload de página de verdade), então a próxima tela abre com o zoom
// torto até o usuário ajustar na mão. Travando a escala em 1, cada tela sempre
// abre encaixada certinha.
//
// viewportFit NÃO é "cover" de propósito: cover faz o Chrome/Safari desenharem
// a página por baixo do notch/barra de status (edge-to-edge), o que exige
// padding com env(safe-area-inset-*) em .tela/.topo/.barra-inferior pra
// compensar — sem isso (ainda não implementado), o topo da tela fica
// escondido atrás da barra de status, parecendo "sem navegabilidade".
export const viewport: Viewport = {
  themeColor: "#0D3B34",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
