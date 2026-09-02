"use client";

import { useActionState } from "react";
import { crearResidente, type CrearResidenteEstado } from "@/app/residentes/actions";
import type { Sucursal } from "@/lib/types";

type Props = {
  sucursales: Sucursal[];
};

const ESTADO_INICIAL: CrearResidenteEstado = { error: null };

export function ResidenteForm({ sucursales }: Props) {
  const [estado, formAction, enviando] = useActionState(crearResidente, ESTADO_INICIAL);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <h2 className="col-span-full text-sm font-semibold text-slate-900">
        Nuevo residente
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
          Fecha de nacimiento
        </label>
        <input
          type="date"
          name="fecha_nacimiento"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nombre
        </label>
        <input
          type="text"
          name="nombre"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Apellido
        </label>
        <input
          type="text"
          name="apellido"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Contacto familiar
        </label>
        <input
          type="text"
          name="contacto_familiar"
          placeholder="Nombre del familiar"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Teléfono familiar
        </label>
        <input
          type="tel"
          name="telefono_familiar"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Obra social
        </label>
        <input
          type="text"
          name="obra_social"
          placeholder="PAMI, OSEP, particular..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tipo de cobertura
        </label>
        <input
          type="text"
          name="tipo_cobertura"
          placeholder="Subsidio, particular..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Cuota mensual
        </label>
        <input
          type="number"
          step="0.01"
          name="cuota_mensual"
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
          {enviando ? "Guardando..." : "Guardar residente"}
        </button>
      </div>
    </form>
  );
}
