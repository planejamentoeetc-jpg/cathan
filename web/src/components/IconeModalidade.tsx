import type { ModalidadeQuiosque } from "@prisma/client";

const CAMINHOS: Record<ModalidadeQuiosque, string> = {
  // prato + talheres
  ALIMENTACAO:
    "M6 3v7a2 2 0 0 0 2 2v9M6 3v6M9 3v6M6 6H4.5M18 3c-2 0-3.5 2-3.5 5s1.5 4 3.5 4V21",
  // copo
  BEBIDAS: "M7 3h10l-1.2 15a2 2 0 0 1-2 1.8h-3.6a2 2 0 0 1-2-1.8L7 3ZM6 8h12",
  // estrela / diversão
  BRINCADEIRAS:
    "M12 2.5l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3-5.4 3 1.3-6-4.5-4.1 6-.7L12 2.5Z",
};

export function IconeModalidade({
  modalidade,
  cor = "#fff",
  tamanho = 24,
}: {
  modalidade: ModalidadeQuiosque;
  cor?: string;
  tamanho?: number;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={CAMINHOS[modalidade]} />
    </svg>
  );
}
