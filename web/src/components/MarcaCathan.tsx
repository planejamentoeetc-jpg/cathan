import { CATHAN_ARREDONDAMENTO, CATHAN_LETRAS_PATH, CATHAN_SORRISO_PATH, CATHAN_VIEWBOX, CORES_MARCA } from "@/lib/marca";

// Versões oficiais do guideline: principal (fundo claro), negativa (fundo
// verde-escuro), monocromática (grafite) e uma cor (verde sorriso). Regras do
// guideline: não distorcer, não trocar cores, não mover o sorriso, sem efeitos;
// tamanho mínimo digital 80px de largura.
export type VarianteMarca = "principal" | "negativa" | "mono" | "cor";

const CORES: Record<VarianteMarca, { letras: string; sorriso: string }> = {
  principal: { letras: CORES_MARCA.verdeCathan, sorriso: CORES_MARCA.verdeSorriso },
  negativa: { letras: CORES_MARCA.branco, sorriso: CORES_MARCA.verdeSorriso },
  mono: { letras: CORES_MARCA.grafite, sorriso: CORES_MARCA.grafite },
  cor: { letras: CORES_MARCA.verdeSorriso, sorriso: CORES_MARCA.verdeSorriso },
};

export function MarcaCathan({
  variante = "principal",
  largura = 140,
  className,
}: {
  variante?: VarianteMarca;
  largura?: number;
  className?: string;
}) {
  const { letras, sorriso } = CORES[variante];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={CATHAN_VIEWBOX}
      width={largura}
      role="img"
      aria-label="cathan"
      className={className}
      style={{ display: "block", height: "auto" }}
    >
      <path
        d={CATHAN_LETRAS_PATH}
        fill={letras}
        stroke={letras}
        strokeWidth={CATHAN_ARREDONDAMENTO}
        strokeLinejoin="round"
      />
      <path d={CATHAN_SORRISO_PATH} fill="none" stroke={sorriso} strokeWidth={104} strokeLinecap="round" />
    </svg>
  );
}

// Ícone de app (C branco + sorriso sobre verde Cathan), usado como selo pequeno.
export function IconeCathan({ tamanho = 36 }: { tamanho?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label="cathan"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <rect width="512" height="512" rx="112" fill={CORES_MARCA.verdeCathan} />
      <path d="M 337 160 A 106 106 0 1 0 337 296" fill="none" stroke="#FFFFFF" strokeWidth={66} strokeLinecap="round" />
      <path d="M 168 376 A 118 118 0 0 0 344 376" fill="none" stroke={CORES_MARCA.verdeSorriso} strokeWidth={46} strokeLinecap="round" />
    </svg>
  );
}

// Assinatura discreta pras telas do cliente ("pedidos por cathan"): o cliente vê
// primeiro a marca do restaurante/evento, a Cathan aparece só como selo.
export function SeloCathan({ largura = 76 }: { largura?: number }) {
  return (
    <div className="selo-cathan">
      <span>pedidos por</span>
      <MarcaCathan variante="mono" largura={largura} />
    </div>
  );
}
