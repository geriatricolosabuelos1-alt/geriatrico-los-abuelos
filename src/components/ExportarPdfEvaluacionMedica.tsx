"use client";

import { crearPdfEvaluacionMedica } from "@/lib/evaluacionMedicaPdf";
import type { EvaluacionMedica, IndicacionMedica } from "@/lib/types";

type Props = {
  residenteNombre: string;
  sede: string;
  dni: string | null;
  edad: number | null;
  fechaNacimiento: string | null;
  obraSocial: string | null;
  afiliado: string | null;
  evaluacion: EvaluacionMedica | null;
  indicacion: IndicacionMedica | null;
};

export function ExportarPdfEvaluacionMedica({
  residenteNombre,
  sede,
  dni,
  edad,
  fechaNacimiento,
  obraSocial,
  afiliado,
  evaluacion,
  indicacion,
}: Props) {
  function exportar() {
    crearPdfEvaluacionMedica({
      residenteNombre,
      sede,
      dni,
      edad,
      fechaNacimiento,
      obraSocial,
      afiliado,
      evaluacion,
      indicacion,
    }).save(`evaluacion-medica-${residenteNombre.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={!evaluacion && !indicacion}
      className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft disabled:cursor-not-allowed disabled:opacity-40"
    >
      ⬇ Descargar PDF
    </button>
  );
}
