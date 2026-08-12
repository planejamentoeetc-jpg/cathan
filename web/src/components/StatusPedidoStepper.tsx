import type { ModalidadeQuiosque, StatusSubPedido } from "@prisma/client";
import { STATUS_ICONE, STATUS_ROTULO_CURTO, etapasStatus, mensagemAmigavel } from "@/lib/statusSubPedido";

export function StatusPedidoStepper({
  status,
  modalidade,
  cor,
  vocEProximo,
  mensagemPreparando,
  mensagemPronto,
}: {
  status: StatusSubPedido;
  modalidade: ModalidadeQuiosque | string;
  cor: string;
  vocEProximo?: boolean;
  mensagemPreparando?: string | null;
  mensagemPronto?: string | null;
}) {
  if (status === "CANCELADO") {
    return (
      <div className="status-mensagem" style={{ background: "#FBEAEA", borderColor: "#F1C6C6" }}>
        <span className="ic">✕</span>
        <span style={{ color: "#B4441C", fontWeight: 700 }}>Esse pedido foi cancelado.</span>
      </div>
    );
  }

  const etapas = etapasStatus(modalidade);
  const indiceAtual = etapas.indexOf(status);
  const mensagem = mensagemAmigavel({ status, modalidade, vocEProximo, mensagemPreparando, mensagemPronto });

  return (
    <div>
      <div className="stepper-status">
        {etapas.map((etapa, indice) => {
          const concluida = indice < indiceAtual;
          const atual = indice === indiceAtual;
          return (
            <div key={etapa} style={{ display: "contents" }}>
              <div className={`etapa${concluida ? " concluida" : ""}${atual ? " atual" : ""}`}>
                <div
                  className="bolha"
                  style={
                    concluida
                      ? { background: cor, borderColor: cor }
                      : atual
                      ? { borderColor: cor, color: cor, boxShadow: `0 0 0 4px ${cor}22` }
                      : undefined
                  }
                >
                  {concluida ? "✓" : ""}
                </div>
                <div className="rotulo">{STATUS_ROTULO_CURTO[etapa]}</div>
              </div>
              {indice < etapas.length - 1 && (
                <div className="linha" style={concluida ? { background: cor } : undefined} />
              )}
            </div>
          );
        })}
      </div>

      <div className="status-mensagem" style={{ borderColor: `${cor}55`, background: `${cor}14` }}>
        <span className="ic">{vocEProximo ? "⏰" : STATUS_ICONE[status]}</span>
        <span style={{ color: "var(--grafite)", fontWeight: 700, fontSize: 13.5 }}>{mensagem}</span>
      </div>
    </div>
  );
}
