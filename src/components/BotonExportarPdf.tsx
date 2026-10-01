"use client";

import { imprimirSinVacios } from "@/lib/impresionHtml";

// omitirVacios: lo vacío o en 0 no se imprime y se avisa antes (solo se usa en Nutrición).
export function BotonExportarPdf({ omitirVacios = false }: { omitirVacios?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => (omitirVacios ? imprimirSinVacios() : window.print())}
      className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
    >
      Exportar PDF
    </button>
  );
}
