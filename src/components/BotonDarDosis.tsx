"use client";

import { useActionState, useState } from "react";
import {
  administrarDosis,
  type AdministrarDosisEstado,
} from "@/app/sucursales/[id]/medicacion/actions";

type Props = {
  sucursalId: string;
  residenteId: string;
  medicamentoId: string;
  stockActual: number;
};

const ESTADO_INICIAL: AdministrarDosisEstado = { error: null };

export function BotonDarDosis({ sucursalId, residenteId, medicamentoId, stockActual }: Props) {
  const [abierto, setAbierto] = useState(false);
  const accionConIds = administrarDosis.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConIds, ESTADO_INICIAL);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full border border-brass/40 px-3 py-1 text-xs font-semibold text-brass hover:bg-brass-soft"
        title={stockActual <= 0 ? "Sin stock disponible — se puede registrar como omitida" : undefined}
      >
        Registrar dosis
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="residente_id" value={residenteId} />
      <input type="hidden" name="medicamento_id" value={medicamentoId} />
      <input
        type="number"
        name="cantidad"
        defaultValue={1}
        min={1}
        max={stockActual > 0 ? stockActual : undefined}
        className="w-14 rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
      />
      <button
        type="submit"
        name="estado"
        value="administrado"
        disabled={enviando || stockActual <= 0}
        title={stockActual <= 0 ? "Sin stock disponible" : undefined}
        className="rounded-full bg-brass px-3 py-1 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "..." : "Administrar"}
      </button>
      <button
        type="submit"
        name="estado"
        value="omitido"
        disabled={enviando}
        className="rounded-full border border-edge px-3 py-1 text-xs font-semibold text-ink-soft hover:border-red-300 hover:text-red-700 disabled:opacity-50"
        title="Registrar que la dosis no se administró"
      >
        Omitir
      </button>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="text-xs text-ink-soft hover:text-ink"
      >
        Cancelar
      </button>
      {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
    </form>
  );
}
