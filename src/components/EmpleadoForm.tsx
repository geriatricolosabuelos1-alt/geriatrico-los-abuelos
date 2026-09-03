"use client";

import { useActionState } from "react";
import { crearEmpleado, type CrearEmpleadoEstado } from "@/app/empleados/actions";
import type { Sucursal } from "@/lib/types";

type Props = {
  sucursales: Sucursal[];
};

const ESTADO_INICIAL: CrearEmpleadoEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

export function EmpleadoForm({ sucursales }: Props) {
  const [estado, formAction, enviando] = useActionState(crearEmpleado, ESTADO_INICIAL);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Nuevo empleado
      </h2>

      <div>
        <label className={ETIQUETA}>Sucursal</label>
        <select name="sucursal_id" required className={CAMPO}>
          <option value="">Seleccionar...</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={ETIQUETA}>Nombre completo</label>
        <input type="text" name="nombre_completo" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Tipo de contratación</label>
        <select name="tipo_contratacion" required className={CAMPO}>
          <option value="">Seleccionar...</option>
          <option value="monotributo">Monotributo</option>
          <option value="relacion_dependencia">Relación de dependencia</option>
        </select>
      </div>

      <div>
        <label className={ETIQUETA}>Forma de pago</label>
        <select name="forma_pago" required className={CAMPO}>
          <option value="">Seleccionar...</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>

      <div>
        <label className={ETIQUETA}>Turno</label>
        <input
          type="text"
          name="turno"
          placeholder="12x2, fijo mañana..."
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Sueldo</label>
        <input type="number" step="0.01" name="sueldo" className={CAMPO} />
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
          {enviando ? "Guardando..." : "Guardar empleado"}
        </button>
      </div>
    </form>
  );
}
