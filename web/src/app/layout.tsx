import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora" });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Cathan",
  description: "O balcão digital do seu evento",
};

// sem isso, o Next só injeta o viewport padrão (sem travar o zoom) — no celular,
// um pinch-zoom acidental numa tela "vaza" pro client-side routing do Next.js
// (não é um reload de página de verdade), então a próxima tela abre com o zoom
// torto até o usuário ajustar na mão. Travando a escala em 1, cada tela sempre
// abre encaixada certinha.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
