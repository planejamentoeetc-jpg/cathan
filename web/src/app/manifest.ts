import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "cathan",
    short_name: "cathan",
    description: "Viva o momento. Nós cuidamos do resto.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D3B34",
    theme_color: "#0D3B34",
    lang: "pt-BR",
    icons: [
      { src: "/marca/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/marca/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/marca/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
