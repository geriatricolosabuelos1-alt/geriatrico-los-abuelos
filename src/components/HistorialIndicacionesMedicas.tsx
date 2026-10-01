"use client";

import { useState } from "react";
import type { IndicacionMedica } from "@/lib/types";

type Props = { indicaciones: IndicacionMedica[] };

function formatearFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function HistorialIndicacionesMedicas({ indicaciones }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-2xl border border-edge bg-card p-4">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between text-left">
        <h2 className="font-display text-base font-semibold text-ink">
          Historial de indicaciones médicas
          {indicaciones.length > 0 && <span className="ml-2 text-xs font-normal text-ink-soft">({indicaciones.length})</span>}
        </h2>
        <span className="text-xs text-ink-soft">{abierto ? "Ocultar ▲" : "Mostrar ▼"}</span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-3">
          {indicaciones.length === 0 && (
            <p className="text-sm text-ink-soft">Todavía no hay indicaciones médicas firmadas para este residente.</p>
          )}
          {indicaciones.map((ind) => (
            <div key={ind.id} className="rounded-xl border border-edge bg-panel-deep p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold capitalize text-ink">{formatearFecha(ind.periodo_desde)}</span>
                <span className="text-ink-soft">Matrícula {ind.matricula ?? "—"}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: 420 }}>
                  <thead className="text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft">
                    <tr>
                      <th className="py-1 pr-2">Medicación</th>
                      <th className="py-1 pr-2">MG</th>
                      <th className="py-1 pr-2">Cant.</th>
                      <th className="py-1 pr-2 text-center">8HS</th>
                      <th className="py-1 pr-2 text-center">12HS</th>
                      <th className="py-1 text-center">20HS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ind.items.map((it, i) => (
                      <tr key={i} className="border-t border-edge text-ink-soft">
                        <td className="py-1 pr-2 text-ink">{it.medicacion}</td>
                        <td className="py-1 pr-2">{it.mg || "—"}</td>
                        <td className="py-1 pr-2">{it.cantidad || "—"}</td>
                        <td className="py-1 pr-2 text-center">{it.h8 ? "X" : "—"}</td>
                        <td className="py-1 pr-2 text-center">{it.h12 ? "X" : "—"}</td>
                        <td className="py-1 text-center">{it.h20 ? "X" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ind.observaciones && <p className="mt-2 text-ink-soft">Obs.: {ind.observaciones}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
