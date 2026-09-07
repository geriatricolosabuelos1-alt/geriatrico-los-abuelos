"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  actualizarArancel,
  type ActualizarArancelEstado,
} from "@/app/sucursales/[id]/cuotas/actions";

type Props = {
  residente: {
    id: string;
    nombre: string;
    apellido: string;
    fecha_ingreso: string | null;
  };
  sucursalId: string;
  obraSocial: string | null;
  cuotaMensual: number | null;
  montoCobertura: number | null;
  porcentajeRecargo: number | null;
};

const ESTADO_INICIAL: ActualizarArancelEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft";

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function formatearMonto(monto: number | null): string {
  return monto != null ? `$${monto.toLocaleString("es-AR")}` : "—";
}

export function TarjetaArancel({
  residente,
  sucursalId,
  obraSocial,
  cuotaMensual,
  montoCobertura,
  porcentajeRecargo,
}: Props) {
  const accionConIds = actualizarArancel.bind(null, residente.id, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConIds, ESTADO_INICIAL);

  const diferencia =
    cuotaMensual != null && montoCobertura != null ? cuotaMensual - montoCobertura : null;

  return (
    <div className="rounded-2xl border border-edge bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-base font-semibold text-ink">
            {residente.apellido}, {residente.nombre}
          </p>
          <p className="text-xs text-ink-soft">
            Ingreso: {formatearFecha(residente.fecha_ingreso)} · Obra social: {obraSocial ?? "—"}
          </p>
        </div>
        <Link
          href={`/residentes/${residente.id}/cuenta-corriente`}
          className="flex-shrink-0 rounded-full border border-edge px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
        >
          Ver cuenta corriente
        </Link>
      </div>

      <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            {diferencia != null ? formatearMonto(diferencia) : "—"}
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
    </div>
  );
}
