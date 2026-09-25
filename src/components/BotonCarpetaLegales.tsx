"use client";

import { useState } from "react";
import { obtenerDatosCarpeta } from "@/app/sucursales/[id]/legales/carpeta-actions";

export function BotonCarpetaLegales({ sucursalId }: { sucursalId: string }) {
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setError(null);
    setProgreso("Buscando la documentación...");
    try {
      const datos = await obtenerDatosCarpeta(sucursalId);
      if (!datos) throw new Error("sin datos");
      // Se carga solo al usarlo: pdf-lib y jsPDF son pesados.
      const { generarCarpetaLegalesPdf } = await import("@/lib/carpetaLegalesPdf");
      const pdf = await generarCarpetaLegalesPdf(datos, setProgreso);

      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `documentacion-legal-${datos.sede}.pdf`.toLowerCase().replace(/\s+/g, "-");
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo armar el PDF. Probá de nuevo.");
    } finally {
      setProgreso(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={descargar}
        disabled={progreso !== null}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-60"
      >
        {progreso ?? "Sacar todo junto (PDF)"}
      </button>
      <p className="text-[0.65rem] text-ink-soft">Resumen + todos los documentos cargados, foliado</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
