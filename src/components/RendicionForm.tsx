"use client";

import { useActionState } from "react";
import { crearRendicion, type CrearRendicionEstado } from "@/app/sucursales/[id]/rendiciones/actions";

type Props = {
  sucursalId: string;
};

const ESTADO_INICIAL: CrearRendicionEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

export function RendicionForm({ sucursalId }: Props) {
  const accionConSucursal = crearRendicion.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-3"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Nueva rendición
      </h2>

      <div className="sm:col-span-3">
        <label className={ETIQUETA}>Foto del ticket</label>
        <input
          type="file"
          name="foto"
          accept="image/*"
          capture="environment"
          required
          className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-panel-deep`}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Monto</label>
        <input type="number" step="0.01" name="monto" className={CAMPO} />
      </div>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Descripción</label>
        <input
          type="text"
          name="descripcion"
          placeholder="Compra verdulería, carnicería..."
          className={CAMPO}
        />
      </div>

      {estado.error && (
        <p className="col-span-full text-sm text-red-400">{estado.error}</p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-panel-deep hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Subiendo..." : "Guardar rendición"}
        </button>
      </div>
    </form>
  );
}
