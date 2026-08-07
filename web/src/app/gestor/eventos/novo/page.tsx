import { CriarEventoForm } from "@/components/CriarEventoForm";

export default function NovoEvento() {
  return (
    <main className="tela">
      <div className="topo" style={{ borderRadius: 18, marginBottom: 16 }}>
        Criar evento
      </div>
      <CriarEventoForm />
    </main>
  );
}
