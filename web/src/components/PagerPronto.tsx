export type ItemPager = {
  id: string;
  codigoRetirada: string;
  quiosqueNome: string;
  brincadeira: boolean;
  mensagemPronto: string | null;
};

export function PagerPronto({ itens, onFechar }: { itens: ItemPager[]; onFechar: () => void }) {
  if (itens.length === 0) return null;

  if (itens.length === 1) {
    const item = itens[0];
    return (
      <div className="pager-overlay">
        <h2>{item.mensagemPronto ?? (item.brincadeira ? "É a sua vez!" : "Seu pedido está pronto!")}</h2>
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
        <button type="button" className="btn-fechar" onClick={onFechar}>
          Estou indo! 🏃
        </button>
      </div>
    );
  }

  return (
    <div className="pager-overlay">
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
          </div>
        ))}
      </div>
      <button type="button" className="btn-fechar" onClick={onFechar}>
        Estou indo! 🏃
      </button>
    </div>
  );
}
