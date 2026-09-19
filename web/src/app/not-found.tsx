import Link from "next/link";
import { MarcaCathan } from "@/components/MarcaCathan";

export default function NaoEncontrado() {
  return (
    <main className="tela" style={{ textAlign: "center", paddingTop: 64 }}>
      <div className="marca-topo">
        <MarcaCathan largura={150} />
      </div>
      <h1 style={{ fontFamily: "var(--font-sora)", fontSize: 22, marginBottom: 8 }}>Página não encontrada</h1>
      <p className="texto-fraco" style={{ marginBottom: 20 }}>
        O endereço pode ter mudado, ou o quiosque ainda não está liberado pro público.
      </p>
      <Link href="/" className="btn btn-primario">
        Ver eventos
      </Link>
    </main>
  );
}
