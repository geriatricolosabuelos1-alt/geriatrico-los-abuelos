"use client";

import { useActionState } from "react";
import {
  registrarMovimiento,
  type RegistrarMovimientoEstado,
} from "@/app/sucursales/[id]/inventario/actions";
import type { CategoriaInsumo, Insumo } from "@/lib/types";

type Props = {
  sucursalId: string;
  insumos: Insumo[];
};

const ESTADO_INICIAL: RegistrarMovimientoEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  general: "General",
  carnes: "Carnes",
  verduras: "Verduras",
};

export function InventarioForm({ sucursalId, insumos }: Props) {
  const accionConSucursal = registrarMovimiento.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  const categorias: CategoriaInsumo[] = ["general", "carnes", "verduras"];

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-3"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Registrar movimiento
      </h2>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Insumo</label>
        <select name="insumo_id" required className={CAMPO}>
          <option value="">Seleccionar...</option>
          {categorias.map((cat) => {
            const items = insumos.filter((i) => i.categoria === cat);
            if (items.length === 0) return null;
            return (
              <optgroup key={cat} label={ETIQUETA_CATEGORIA[cat]}>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      <div>
        <label className={ETIQUETA}>Tipo</label>
        <select name="tipo" required className={CAMPO}>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </div>

      <div>
        <label className={ETIQUETA}>Cantidad</label>
        <input type="number" step="0.01" name="cantidad" required className={CAMPO} />
      </div>

      {estado.error && (
        <p className="col-span-full text-sm text-red-400">{estado.error}</p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}
