"use client";

import { imprimirSinVacios } from "@/lib/impresionHtml";

// omitirVacios: lo vacío o en 0 no se imprime y se avisa antes (solo se usa en Nutrición).
export function BotonImprimir({ omitirVacios = false }: { omitirVacios?: boolean }) {
  return (
    <button
      onClick={() => (omitirVacios ? imprimirSinVacios() : window.print())}
      className="print:hidden rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
