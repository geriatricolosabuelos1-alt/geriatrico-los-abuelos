"use client";

import { descargarPdf } from "@/lib/pdf";
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

function fecha(valor: string | null): string {
  if (!valor) return "—";
  return new Date(valor.length === 10 ? valor + "T00:00:00" : valor).toLocaleDateString("es-AR");
}

function mesAnio(valor: string): string {
  return new Date(valor + "T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

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
    const secciones = [
      {
        titulo: "Datos del residente",
        columnas: ["Campo", "Valor"],
        filas: [
          ["DNI", dni ?? "—"],
          ["Edad", edad !== null ? `${edad} años` : "—"],
          ["Fecha de nacimiento", fecha(fechaNacimiento)],
          ["Obra social", obraSocial ?? "—"],
          ["Afiliado", afiliado ?? "—"],
        ],
      },
    ];

    if (evaluacion) {
      secciones.push({
        titulo: `Evaluación médica — ${fecha(evaluacion.fecha)}`,
        columnas: ["Campo", "Valor"],
        filas: [
          ["Antecedentes", evaluacion.antecedentes ?? "—"],
          ["Estado de conciencia", evaluacion.estado_conciencia ?? "—"],
          ["Orientación", evaluacion.orientacion.length > 0 ? evaluacion.orientacion.join(", ") : "—"],
          ...(evaluacion.obs_orientacion ? [["Obs. orientación", evaluacion.obs_orientacion]] : []),
          ["Alimentación", evaluacion.alimentacion ?? "—"],
          ["Consistencia", evaluacion.consistencia ?? "—"],
          ...(evaluacion.obs_alimentacion ? [["Obs. alimentación", evaluacion.obs_alimentacion]] : []),
          ["Marcha / Movilidad", evaluacion.marcha_movilidad ?? "—"],
          ["Control urinario", evaluacion.control_urinario ?? "—"],
          ["Control fecal", evaluacion.control_fecal ?? "—"],
          ...(evaluacion.obs_esfinteres ? [["Obs. esfínteres", evaluacion.obs_esfinteres]] : []),
          ["Conducta", evaluacion.conducta ?? "—"],
        ],
      });
    }

    if (indicacion) {
      secciones.push({
        titulo: `Indicaciones médicas — ${mesAnio(indicacion.periodo_desde)}`,
        columnas: ["Medicación", "MG", "Cant. comp.", "8HS", "12HS", "20HS"],
        filas: indicacion.items.map((it) => [
          it.medicacion,
          it.mg || "—",
          it.cantidad || "—",
          it.h8 ? "X" : "—",
          it.h12 ? "X" : "—",
          it.h20 ? "X" : "—",
        ]),
      });
      if (indicacion.observaciones) {
        secciones.push({
          titulo: "Observaciones de indicaciones",
          columnas: ["Detalle"],
          filas: [[indicacion.observaciones]],
        });
      }
    }

    // Solo la firma de la médica; si todavía no lo firmó, queda indicado (sin nombre de quien lo cargó).
    const firmado = evaluacion?.firmado_por ? evaluacion : indicacion?.firmado_por ? indicacion : null;
    secciones.push({
      titulo: "Firma",
      columnas: ["Médica", "Matrícula", "Fecha de firma"],
      filas: [
        firmado
          ? [firmado.firmante ?? "—", firmado.matricula ?? "—", fecha(firmado.firmado_at)]
          : ["Pendiente de firma médica", evaluacion?.matricula ?? indicacion?.matricula ?? "—", "—"],
      ],
    });

    descargarPdf(
      `evaluacion-medica-${residenteNombre.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      {
        titulo: `Evaluación médica — ${residenteNombre}`,
        subtitulo: sede,
        // La fecha de impresión va abajo y chica: la fecha que vale es la de la evaluación.
        pie: `Impreso el ${new Date().toLocaleDateString("es-AR")}`,
      },
      secciones,
    );
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
