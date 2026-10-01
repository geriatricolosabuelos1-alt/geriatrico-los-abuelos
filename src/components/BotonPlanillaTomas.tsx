"use client";

import { useState } from "react";
import { obtenerPlanillaTomas } from "@/app/residentes/[id]/legajo/medicacion-actions";

function mesActual(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date()).slice(0, 7);
}

// Descarga la planilla de tomas del mes para tildar a mano: de un residente o de toda la sede.
export function BotonPlanillaTomas({
  filtro,
  etiqueta = "Planilla de tomas para tildar (PDF)",
}: {
  filtro: { residenteId: string } | { sucursalId: string };
  etiqueta?: string;
}) {
  const [mes, setMes] = useState(mesActual);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      setError("Elegí el mes.");
      return;
    }
    setGenerando(true);
    setError(null);
    try {
      const planillas = await obtenerPlanillaTomas(filtro);
      if (planillas.length === 0) {
        setError("No hay residentes para imprimir.");
        return;
      }
      const { generarPlanillaTomasPdf } = await import("@/lib/planillaTomasPdf");
      const pdf = generarPlanillaTomasPdf(planillas, mes);
      const quien = planillas.length === 1 ? planillas[0].nombre : planillas[0].sede;
      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `planilla-tomas-${quien}-${mes}.pdf`.toLowerCase().replace(/[,\s]+/g, "-");
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo armar el PDF. Probá de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-edge bg-card px-2 py-1.5 text-xs text-ink focus:border-brass focus:outline-none"
        />
        <button
          type="button"
          onClick={descargar}
          disabled={generando}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink disabled:opacity-60"
        >
          {generando ? "Armando PDF..." : etiqueta}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
