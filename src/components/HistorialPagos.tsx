"use client";

import { useState } from "react";

type PagoHistorial = {
  monto: number;
  fecha: string;
};

type Props = {
  montoTotal: number;
  historial: PagoHistorial[];
};

export function HistorialPagos({ montoTotal, historial }: Props) {
  const [abierto, setAbierto] = useState(false);

  if (historial.length === 0) return null;

  const ordenado = [...historial].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  let acumulado = 0;
  const filas = ordenado.map((h) => {
    acumulado += h.monto;
    return { ...h, restante: montoTotal - acumulado };
  });

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
      >
        {abierto ? "Ocultar pagos" : `Ver pagos (${historial.length})`}
      </button>
      {abierto && (
        <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
          {filas.map((f, i) => (
            <li key={i}>
              {new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR")} — pagó $
              {f.monto.toLocaleString("es-AR")}
              {f.restante > 0 && (
                <span className="text-amber-400"> · restan ${f.restante.toLocaleString("es-AR")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
