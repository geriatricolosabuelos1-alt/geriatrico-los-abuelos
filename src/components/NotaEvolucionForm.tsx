"use client";

import { useActionState } from "react";
import { crearNotaEvolucion, type CrearNotaEstado } from "@/app/residentes/[id]/evolucion/actions";

type Props = {
  residenteId: string;
  mostrarSelectorTipo: boolean;
};

const ESTADO_INICIAL: CrearNotaEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

export function NotaEvolucionForm({ residenteId, mostrarSelectorTipo }: Props) {
  const accionConId = crearNotaEvolucion.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-edge bg-card p-5">
      {mostrarSelectorTipo && (
        <div>
          <label className={ETIQUETA}>Tipo de nota</label>
          <select name="tipo" required className={CAMPO}>
            <option value="">Seleccionar...</option>
            <option value="medica">Médica</option>
            <option value="enfermeria">Enfermería</option>
            <option value="nutricion">Nutrición</option>
            <option value="kinesiologia">Kinesiología</option>
          </select>
        </div>
      )}

      <div>
        <label className={ETIQUETA}>Nota</label>
        <textarea name="contenido" required rows={3} className={CAMPO} />
      </div>

      {estado.error && <p className="text-sm text-red-400">{estado.error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Agregar nota"}
      </button>
    </form>
  );
}
