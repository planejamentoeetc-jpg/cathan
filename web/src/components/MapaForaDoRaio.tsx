function formatarDistancia(metros: number) {
  if (metros >= 1000) {
    return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  }
  return `${metros} m`;
}

// Mapa ilustrativo (não é geolocalização real) — mesma composição do protótipo:
// área do evento (raio cadastrado pelo gestor) em verde tracejado, você em laranja fora dela.
export function MapaForaDoRaio({ distanciaMetros, raioMetros }: { distanciaMetros: number; raioMetros: number }) {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--linha)", background: "#fff", marginBottom: 16 }}>
      <svg viewBox="0 0 360 290" style={{ display: "block", width: "100%", height: "auto" }}>
        <rect width="360" height="290" fill="#EDF3EF" />
        <g fill="#E0EAE3">
          <rect x="14" y="14" width="96" height="88" rx="8" />
          <rect x="128" y="14" width="96" height="88" rx="8" />
          <rect x="14" y="120" width="96" height="88" rx="8" />
          <rect x="128" y="120" width="96" height="88" rx="8" />
          <rect x="14" y="226" width="96" height="50" rx="8" />
          <rect x="128" y="226" width="96" height="50" rx="8" />
          <rect x="242" y="226" width="104" height="50" rx="8" />
        </g>
        <rect x="242" y="14" width="104" height="194" rx="10" fill="#D5E9DC" />
        <rect x="258" y="130" width="46" height="30" rx="4" fill="#C3DECC" />
        <g stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round">
          <line x1="0" y1="111" x2="360" y2="111" />
          <line x1="0" y1="217" x2="360" y2="217" />
          <line x1="119" y1="0" x2="119" y2="290" />
          <line x1="233" y1="0" x2="233" y2="290" />
        </g>
        <circle cx="288" cy="92" r="70" fill="rgba(30,142,90,.20)" stroke="var(--verde)" strokeWidth="2.5" strokeDasharray="7 5" />
        <line x1="86" y1="238" x2="238" y2="132" stroke="var(--festa)" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
        <rect x="118" y="170" width="78" height="21" rx="10" fill="#FFFFFF" stroke="#FFD9C8" />
        <text x="157" y="185" textAnchor="middle" fontFamily="Manrope,sans-serif" fontSize="12" fontWeight="800" fill="#B4441C">
          ≈ {formatarDistancia(distanciaMetros)}
        </text>
        <g transform="translate(288 92)">
          <circle r="15" fill="var(--verde)" />
          <path d="M0 6 L0 -2 M-6 2 L0 -4 6 2 M-5 -4 h10" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="228" y="118" width="120" height="22" rx="11" fill="#FFFFFF" stroke="#D7E5DC" />
        <text x="288" y="133" textAnchor="middle" fontFamily="Manrope,sans-serif" fontSize="12" fontWeight="800" fill="var(--petroleo)">
          Área do evento
        </text>
        <text x="288" y="30" textAnchor="middle" fontFamily="Manrope,sans-serif" fontSize="10.5" fontWeight="700" fill="var(--verde)">
          raio {raioMetros} m
        </text>
        <g transform="translate(78 244)">
          <circle r="16" fill="rgba(255,122,69,.25)">
            <animate attributeName="r" values="12;20;12" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle r="9" fill="var(--festa)" stroke="#fff" strokeWidth="2.5" />
        </g>
        <rect x="36" y="262" width="84" height="21" rx="10" fill="#FFFFFF" stroke="#FFD9C8" />
        <text x="78" y="277" textAnchor="middle" fontFamily="Manrope,sans-serif" fontSize="11.5" fontWeight="800" fill="#B4441C">
          Você está aqui
        </text>
      </svg>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
          padding: 9,
          fontSize: 11.5,
          color: "var(--cinza)",
          borderTop: "1px solid var(--linha)",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "rgba(30,142,90,.22)",
            border: "1.5px dashed var(--verde)",
            display: "inline-block",
          }}
        />
        área que aceita pedidos · raio de {raioMetros} m definido pelo gestor
      </div>
    </div>
  );
}
