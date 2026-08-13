import type { ModalidadeQuiosque, StatusSubPedido } from "@prisma/client";
import { STATUS_ICONE, STATUS_ROTULO_CURTO, etapasStatus, mensagemAmigavel } from "@/lib/statusSubPedido";

export function StatusPedidoStepper({
  status,
  modalidade,
  cor,
  vocEProximo,
  mensagemPreparando,
  mensagemPronto,
  aguardandoLiberacao,
}: {
  status: StatusSubPedido;
  modalidade: ModalidadeQuiosque | string;
  cor: string;
  vocEProximo?: boolean;
  mensagemPreparando?: string | null;
  mensagemPronto?: string | null;
  // true quando NENHUM item deste sub-pedido foi liberado pra produção ainda —
  // o pedido existe (foi pago) mas o quiosque nem sabe que ele existe. Precisa
  // aparecer como uma etapa própria, antes de "Enviado", senão o cliente lê
  // "Enviado" e acha que o quiosque já está com o pedido em mãos.
  aguardandoLiberacao?: boolean;
}) {
  if (status === "CANCELADO") {
    return (
      <div className="status-mensagem" style={{ background: "#FBEAEA", borderColor: "#F1C6C6" }}>
        <span className="ic">✕</span>
        <span style={{ color: "#B4441C", fontWeight: 700 }}>Esse pedido foi cancelado.</span>
      </div>
    );
  }

  const etapasReais = etapasStatus(modalidade);
  const indiceReal = etapasReais.indexOf(status);

  // com aguardandoLiberacao, uma etapa extra ("Confirmar") entra na frente e fica
  // marcada como a atual — nenhuma das etapas reais foi alcançada de verdade ainda.
  const etapas = aguardandoLiberacao
    ? [{ chave: "confirmar", rotulo: "Confirmar" }, ...etapasReais.map((e) => ({ chave: e, rotulo: STATUS_ROTULO_CURTO[e] }))]
    : etapasReais.map((e) => ({ chave: e, rotulo: STATUS_ROTULO_CURTO[e] }));
  const indiceAtual = aguardandoLiberacao ? 0 : indiceReal;

  const mensagem = aguardandoLiberacao
    ? "Seu pedido está pronto, mas ainda não foi enviado! Toque em \"Mandar pra produção\" abaixo quando quiser."
    : mensagemAmigavel({ status, modalidade, vocEProximo, mensagemPreparando, mensagemPronto });
  const icone = aguardandoLiberacao ? "📤" : vocEProximo ? "⏰" : STATUS_ICONE[status];

  return (
    <div>
      <div className="stepper-status">
        {etapas.map((etapa, indice) => {
          const concluida = indice < indiceAtual;
          const atual = indice === indiceAtual;
          // a bolinha preenchida é a fase em que o pedido ESTÁ agora, não só as já
          // ultrapassadas — senão o cliente lê o stepper uma etapa "atrasado"
          const preenchida = concluida || atual;
          return (
            <div key={etapa.chave} style={{ display: "contents" }}>
              <div className={`etapa${concluida ? " concluida" : ""}${atual ? " atual" : ""}`}>
                <div
                  className="bolha"
                  style={
                    preenchida
                      ? {
                          background: cor,
                          borderColor: cor,
                          ...(atual ? { boxShadow: `0 0 0 4px ${cor}33` } : {}),
                        }
                      : undefined
                  }
                >
                  {concluida ? "✓" : ""}
                </div>
                <div className="rotulo">{etapa.rotulo}</div>
              </div>
              {indice < etapas.length - 1 && (
                <div className="linha" style={concluida ? { background: cor } : undefined} />
              )}
            </div>
          );
        })}
      </div>

      <div className="status-mensagem" style={{ borderColor: `${cor}55`, background: `${cor}14` }}>
        <span className="ic">{icone}</span>
        <span style={{ color: "var(--grafite)", fontWeight: 700, fontSize: 13.5 }}>{mensagem}</span>
      </div>
    </div>
  );
}
