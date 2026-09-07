"use client";

export function BotonExportarPdf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
    >
      Exportar PDF
    </button>
  );
}
