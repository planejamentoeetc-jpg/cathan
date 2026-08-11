"use client";

import { KeyboardEvent, useState } from "react";

function IconeOlho() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoFechado() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c7 0 10.5 7 10.5 7a15.6 15.6 0 0 1-3.4 4.3M6.6 6.6C3.4 8.6 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function CampoSenha({
  label,
  value,
  onChange,
  onKeyDown,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="campo">
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={visivel ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          style={{ width: "100%", paddingRight: 42 }}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          style={{
            position: "absolute",
            right: 2,
            top: "50%",
            transform: "translateY(-50%)",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--cinza)",
          }}
        >
          {visivel ? <IconeOlhoFechado /> : <IconeOlho />}
        </button>
      </div>
    </div>
  );
}
