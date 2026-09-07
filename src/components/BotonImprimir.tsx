"use client";

export function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
