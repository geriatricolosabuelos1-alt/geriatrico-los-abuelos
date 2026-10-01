"use client";

import { useState } from "react";
import type { EvaluacionMedica } from "@/lib/types";

type Props = { evaluaciones: EvaluacionMedica[] };

function formatearFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <p>
      <span className="font-semibold text-ink">{etiqueta}:</span> {valor}
    </p>
  );
}

export function HistorialEvaluacionesMedicas({ evaluaciones }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-2xl border border-edge bg-card p-4">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between text-left">
        <h2 className="font-display text-base font-semibold text-ink">
          Historial de evaluaciones médicas
          {evaluaciones.length > 0 && <span className="ml-2 text-xs font-normal text-ink-soft">({evaluaciones.length})</span>}
        </h2>
        <span className="text-xs text-ink-soft">{abierto ? "Ocultar ▲" : "Mostrar ▼"}</span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-3">
          {evaluaciones.length === 0 && (
            <p className="text-sm text-ink-soft">Todavía no hay evaluaciones médicas firmadas para este residente.</p>
          )}
          {evaluaciones.map((e) => (
            <div key={e.id} className="rounded-xl border border-edge bg-panel-deep p-3 text-xs text-ink-soft">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-semibold text-ink">{formatearFecha(e.fecha)}</span>
                <span>Matrícula {e.matricula ?? "—"}</span>
              </div>
              <Dato etiqueta="Antecedentes" valor={e.antecedentes} />
              <Dato etiqueta="Estado de conciencia" valor={e.estado_conciencia} />
              <Dato etiqueta="Orientación" valor={e.orientacion.length > 0 ? e.orientacion.join(", ") : null} />
              <Dato etiqueta="Alimentación" valor={e.alimentacion} />
              <Dato etiqueta="Consistencia" valor={e.consistencia} />
              <Dato etiqueta="Marcha / Movilidad" valor={e.marcha_movilidad} />
              <Dato etiqueta="Control urinario" valor={e.control_urinario} />
              <Dato etiqueta="Control fecal" valor={e.control_fecal} />
              <Dato etiqueta="Conducta" valor={e.conducta} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
