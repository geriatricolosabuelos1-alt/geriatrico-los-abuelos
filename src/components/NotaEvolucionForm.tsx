"use client";

import { useActionState } from "react";
import { crearNotaEvolucion, type CrearNotaEstado } from "@/app/residentes/[id]/evolucion/actions";

type Props = {
  residenteId: string;
  mostrarSelectorTipo: boolean;
};

const ESTADO_INICIAL: CrearNotaEstado = { error: null };

export function NotaEvolucionForm({ residenteId, mostrarSelectorTipo }: Props) {
  const accionConId = crearNotaEvolucion.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      {mostrarSelectorTipo && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tipo de nota
          </label>
          <select
            name="tipo"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            <option value="medica">Médica</option>
            <option value="enfermeria">Enfermería</option>
            <option value="nutricion">Nutrición</option>
            <option value="kinesiologia">Kinesiología</option>
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nota
        </label>
        <textarea
          name="contenido"
          required
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Agregar nota"}
      </button>
    </form>
  );
}
