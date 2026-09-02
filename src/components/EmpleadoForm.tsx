"use client";

import { useActionState } from "react";
import { crearEmpleado, type CrearEmpleadoEstado } from "@/app/empleados/actions";
import type { Sucursal } from "@/lib/types";

type Props = {
  sucursales: Sucursal[];
};

const ESTADO_INICIAL: CrearEmpleadoEstado = { error: null };

export function EmpleadoForm({ sucursales }: Props) {
  const [estado, formAction, enviando] = useActionState(crearEmpleado, ESTADO_INICIAL);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <h2 className="col-span-full text-sm font-semibold text-slate-900">
        Nuevo empleado
      </h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Sucursal
        </label>
        <select
          name="sucursal_id"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nombre completo
        </label>
        <input
          type="text"
          name="nombre_completo"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tipo de contratación
        </label>
        <select
          name="tipo_contratacion"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          <option value="monotributo">Monotributo</option>
          <option value="relacion_dependencia">Relación de dependencia</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Forma de pago
        </label>
        <select
          name="forma_pago"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Turno
        </label>
        <input
          type="text"
          name="turno"
          placeholder="12x2, fijo mañana..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Sueldo
        </label>
        <input
          type="number"
          step="0.01"
          name="sueldo"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {estado.error && (
        <p className="col-span-full text-sm text-red-600">{estado.error}</p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar empleado"}
        </button>
      </div>
    </form>
  );
}
