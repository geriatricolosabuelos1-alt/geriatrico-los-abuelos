"use client";

import { useState } from "react";
import type { MetodoPago } from "@/lib/types";

type PagoHistorial = {
  monto: number;
  fecha: string;
  metodo_pago: MetodoPago | null;
};

type Props = {
  montoTotal: number;
  montoPagado: number;
  historial: PagoHistorial[];
};

const ETIQUETA_METODO: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago",
};

export function HistorialPagos({ montoTotal, montoPagado, historial }: Props) {
  const [abierto, setAbierto] = useState(false);

  if (historial.length === 0) return null;

  const ordenado = [...historial].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  // Puede haber pagos previos a que existiera este historial: el punto de
  // partida es lo ya pagado menos lo que sí quedó registrado acá.
  const registrado = historial.reduce((acc, h) => acc + h.monto, 0);
  let acumulado = montoPagado - registrado;
  const filas = ordenado.map((h) => {
    acumulado += h.monto;
    return { ...h, restante: montoTotal - acumulado };
  });

  const tabla = (
    <table className="mt-2 w-full max-w-sm border-l-2 border-brass-soft text-xs print:max-w-none print:border-neutral-300">
      <thead>
        <tr className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70 print:text-neutral-500">
          <th className="px-3 py-1 text-left font-medium">Fecha</th>
          <th className="px-3 py-1 text-left font-medium">Pagó</th>
          <th className="px-3 py-1 text-left font-medium">Medio</th>
          <th className="px-3 py-1 text-left font-medium">Saldo</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr
            key={i}
            className={
              i < filas.length - 1 ? "border-b border-dashed border-edge print:border-neutral-300" : ""
            }
          >
            <td className="px-3 py-1 text-ink-soft whitespace-nowrap print:text-neutral-700">
              {new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR")}
            </td>
            <td className="px-3 py-1 font-medium text-ink print:text-black">
              ${f.monto.toLocaleString("es-AR")}
            </td>
            <td className="px-3 py-1 text-ink-soft whitespace-nowrap print:text-neutral-700">
              {f.metodo_pago ? ETIQUETA_METODO[f.metodo_pago] : "—"}
            </td>
            <td className="px-3 py-1 font-medium text-amber-400 print:text-black">
              {f.restante > 0 ? `$${f.restante.toLocaleString("es-AR")}` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="mt-1">
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-brass hover:text-ink"
        >
          <span
            className={`text-[0.6rem] transition-transform ${abierto ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          {abierto ? "Ocultar pagos" : `Ver pagos (${historial.length})`}
        </button>

        {abierto && tabla}
      </div>

      <div className="hidden print:block">{tabla}</div>
    </div>
  );
}
