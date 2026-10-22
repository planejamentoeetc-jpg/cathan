"use client";

// Cobre a tela quando o usePollingEconomico pausou por inatividade — deixa
// claro que os dados NÃO estão mais atualizando (senão uma fila/telão parado
// pareceria só "sem pedidos novos"). Qualquer toque já retoma via o próprio
// hook; o botão é só a affordance visível.
export function AvisoPollingPausado({ pausado, onRetomar }: { pausado: boolean; onRetomar: () => void }) {
  if (!pausado) return null;
  return (
    <div className="polling-pausado" role="alertdialog" aria-live="polite">
      <h2>Tela pausada</h2>
      <p>Ficou muito tempo sem novidades, então paramos de atualizar para economizar.</p>
      <button type="button" className="btn btn-primario"onClick={onRetomar}>
        Toque para continuar
      </button>
    </div>
  );
}
