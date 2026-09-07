"use client";

import { useActionState } from "react";
import {
  actualizarArancel,
  type ActualizarArancelEstado,
} from "@/app/sucursales/[id]/cuotas/actions";

type Props = {
  residenteId: string;
  sucursalId: string;
  cuotaMensual: number | null;
  montoCobertura: number | null;
  porcentajeRecargo: number | null;
};

const ESTADO_INICIAL: ActualizarArancelEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft";

function formatearMonto(monto: number | null): string {
  return monto != null ? `$${monto.toLocaleString("es-AR")}` : "—";
}

export function EditorArancel({
  residenteId,
  sucursalId,
  cuotaMensual,
  montoCobertura,
  porcentajeRecargo,
}: Props) {
  const accionConIds = actualizarArancel.bind(null, residenteId, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConIds, ESTADO_INICIAL);

  const diferencia =
    cuotaMensual != null && montoCobertura != null ? cuotaMensual - montoCobertura : null;

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-4"
    >
      <h2 className="col-span-2 font-display text-sm font-semibold text-ink sm:col-span-4">
        Arancel
      </h2>

      <div>
        <label className={ETIQUETA}>Arancel por contrato</label>
        <input
          type="number"
          step="0.01"
          name="cuota_mensual"
          defaultValue={cuotaMensual ?? ""}
          className={CAMPO}
        />
      </div>
      <div>
        <label className={ETIQUETA}>Cubre la obra social</label>
        <input
          type="number"
          step="0.01"
          name="monto_cobertura_obra_social"
          defaultValue={montoCobertura ?? ""}
          className={CAMPO}
        />
      </div>
      <div>
        <label className={ETIQUETA}>Diferencia a pagar</label>
        <p className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm font-semibold text-brass">
          {formatearMonto(diferencia)}
        </p>
      </div>
      <div>
        <label className={ETIQUETA}>% recargo por mora</label>
        <input
          type="number"
          step="0.01"
          name="porcentaje_recargo_mora"
          defaultValue={porcentajeRecargo ?? ""}
          placeholder="ej. 5"
          className={CAMPO}
        />
      </div>

      <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar"}
        </button>
        {estado.error && <p className="text-xs text-red-400">{estado.error}</p>}
      </div>
    </form>
  );
}
