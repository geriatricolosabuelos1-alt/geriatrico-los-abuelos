"use client";

import { useActionState } from "react";
import {
  guardarItemInventario,
  type GuardarItemEstado,
} from "@/app/sucursales/[id]/inventario/actions";

type Props = {
  sucursalId: string;
};

const ESTADO_INICIAL: GuardarItemEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

export function InventarioForm({ sucursalId }: Props) {
  const accionConSucursal = guardarItemInventario.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-3"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Cargar / actualizar ítem
      </h2>

      <div>
        <label className={ETIQUETA}>Ítem</label>
        <input
          type="text"
          name="item"
          required
          placeholder="Pañales talle G"
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Cantidad</label>
        <input type="number" name="cantidad" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Unidad</label>
        <input
          type="text"
          name="unidad"
          defaultValue="unidades"
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
          {enviando ? "Guardando..." : "Guardar"}
        </button>
        <p className="mt-2 text-xs text-ink-soft">
          Si el ítem ya existe, se actualiza la cantidad.
        </p>
      </div>
    </form>
  );
}
