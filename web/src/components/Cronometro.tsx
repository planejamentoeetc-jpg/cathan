"use client";

import { useEffect, useState } from "react";

function calcularRestanteMs(inicioEm: string, duracaoMinutos: number) {
  const fim = new Date(inicioEm).getTime() + duracaoMinutos * 60000;
  return fim - Date.now();
}

function formatarMMSS(restanteMs: number) {
  const totalSegundos = Math.max(0, Math.round(restanteMs / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

export function Cronometro({
  inicioEm,
  duracaoMinutos,
  className,
}: {
  inicioEm: string;
  duracaoMinutos: number;
  className?: string;
}) {
  const [restanteMs, setRestanteMs] = useState(() => calcularRestanteMs(inicioEm, duracaoMinutos));

  useEffect(() => {
    const id = setInterval(() => setRestanteMs(calcularRestanteMs(inicioEm, duracaoMinutos)), 1000);
    return () => clearInterval(id);
  }, [inicioEm, duracaoMinutos]);

  const expirado = restanteMs <= 0;

  return (
    <span className={`${className ?? ""} ${expirado ? "destaque-piscante" : ""}`.trim()}>
      {expirado ? "Tempo esgotado" : formatarMMSS(restanteMs)}
    </span>
  );
}
