"use client";

import { descargarPdf } from "@/lib/pdf";

type Fila = {
  habitacion: string;
  residente: string;
  dieta: string;
  consistencia: string;
  liquidos: string;
  exclusiones: string;
};

type Props = {
  sucursalNombre: string;
  filas: Fila[];
};

export function ExportarPdfCocina({ sucursalNombre, filas }: Props) {
  function exportar() {
    descargarPdf(
      `sabana-cocina-${sucursalNombre.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      {
        titulo: "Sábana de cocina",
        subtitulo: sucursalNombre,
        fecha: `Generado el ${new Date().toLocaleDateString("es-AR")}`,
      },
      [
        {
          columnas: ["Hab.", "Residente", "Dieta", "Consistencia", "Líquidos", "Exclusiones / preferencias"],
          filas: filas.map((f) => [
            f.habitacion,
            f.residente,
            f.dieta,
            f.consistencia,
            f.liquidos,
            f.exclusiones,
          ]),
        },
      ],
    );
  }

  return (
    <button
      type="button"
      onClick={exportar}
      className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
    >
      Descargar PDF
    </button>
  );
}
