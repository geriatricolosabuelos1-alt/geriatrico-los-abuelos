"use client";

import { useActionState } from "react";
import {
  generarPeriodoDelMes,
  type GenerarPeriodoEstado,
} from "@/app/sucursales/[id]/cuotas/actions";

type Props = {
  sucursalId: string;
};

const ESTADO_INICIAL: GenerarPeriodoEstado = { error: null, generados: 0, omitidos: 0 };

function mesAnioActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export function GenerarPeriodoForm({ sucursalId }: Props) {
  const accionConSucursal = generarPeriodoDelMes.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="month"
          name="mes_anio"
          required
          defaultValue={mesAnioActual()}
          className="rounded-lg border border-edge bg-panel-deep px-3 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          style={{ colorScheme: "dark" }}
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Generando..." : "Generar período"}
        </button>
      </div>
      {estado.error && <p className="text-xs text-red-400">{estado.error}</p>}
      {!estado.error && (estado.generados > 0 || estado.omitidos > 0) && (
        <p className="text-xs text-ink-soft">
          {estado.generados} generado(s), {estado.omitidos} ya existían.
        </p>
      )}
    </form>
  );
}
