export type ItemPager = {
  id: string;
  codigoRetirada: string;
  quiosqueNome: string;
  brincadeira: boolean;
  mensagemPronto: string | null;
  // true depois que o cliente já tocou "Estou indo!" pra este item — continua
  // na tela cheia (pra ele mostrar o código no balcão), só que sem o pulso
  // chamativo e sem o botão, já que a ação dele já foi tomada.
  confirmado: boolean;
};

export function PagerPronto({
  itens,
  onConfirmar,
}: {
  itens: ItemPager[];
  onConfirmar: (id: string) => void;
}) {
  if (itens.length === 0) return null;

  const todosConfirmados = itens.every((item) => item.confirmado);

  if (itens.length === 1) {
    const item = itens[0];
    return (
      <div className={`pager-overlay${item.confirmado ? " pager-parado" : ""}`}>
        <h2>
          {item.confirmado
            ? "A caminho da retirada"
            : item.mensagemPronto ?? (item.brincadeira ? "É a sua vez!" : "Seu pedido está pronto!")}
        </h2>
        <div className="pager-anel">
          <b>{item.codigoRetirada}</b>
        </div>
        <p>
          {item.quiosqueNome}
          <br />
          {item.brincadeira
            ? "Vá até lá agora e mostre este código."
            : "Mostre este código no balcão para retirar."}
        </p>
        {!item.confirmado && (
          <button type="button" className="btn-fechar" onClick={() => onConfirmar(item.id)}>
            Estou indo! 🏃
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`pager-overlay${todosConfirmados ? " pager-parado" : ""}`}>
      <h2>{itens.length} chamadas para você!</h2>
      <p>Cada uma é em um balcão — este é o seu roteiro:</p>
      <div className="pager-lista">
        {itens.map((item) => (
          <div key={item.id} className="pager-item">
            <b>{item.codigoRetirada}</b>
            <span>
              {item.quiosqueNome}
              <br />
              <span style={{ opacity: 0.85, fontWeight: 600 }}>
                {item.brincadeira ? "é a sua vez" : "retire neste quiosque"}
              </span>
            </span>
            {item.confirmado ? (
              <span className="pager-item-ok">✓ indo</span>
            ) : (
              <button type="button" className="btn-fechar-mini" onClick={() => onConfirmar(item.id)}>
                Estou indo! 🏃
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
