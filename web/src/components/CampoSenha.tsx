"use client";

import { KeyboardEvent, useState } from "react";
import { IconeOlho, IconeOlhoFechado } from "@/components/IconesOlho";

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
