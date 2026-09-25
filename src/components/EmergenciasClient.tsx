"use client";

import { useActionState } from "react";
import { eliminarEmergencia, registrarEmergencia } from "@/app/sucursales/[id]/emergencias/actions";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function ahoraArgentina(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: `${v("hour")}:${v("minute")}` };
}

export function FormularioEmergencia({
  sucursalId,
  residentes,
  prestadores,
}: {
  sucursalId: string;
  residentes: { id: string; nombre: string; apellido: string }[];
  prestadores: string[];
}) {
  const accion = registrarEmergencia.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);
  const ahora = ahoraArgentina();

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
    >
      <h2 className="font-display text-base font-semibold text-ink sm:col-span-2 lg:col-span-4">
        Registrar llamada de emergencia
      </h2>
      <div>
        <label className={ETIQUETA_MIN}>Fecha</label>
        <input type="date" name="fecha" required defaultValue={ahora.fecha} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Hora</label>
        <input type="time" name="hora" defaultValue={ahora.hora} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Prestador</label>
        <input
          name="prestador"
          required
          list="prestadores-emergencia"
          defaultValue={prestadores[0] ?? ""}
          placeholder="Empresa de emergencias"
          className={CAMPO}
        />
        <datalist id="prestadores-emergencia">
          {prestadores.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Residente</label>
        <select name="residente_id" defaultValue="" className={CAMPO}>
          <option value="">—</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Motivo</label>
        <input name="motivo" placeholder="Ej: caída, dificultad respiratoria" className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Demora en llegar (min)</label>
        <input type="number" name="demora_minutos" min={0} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>¿Atención satisfactoria?</label>
        <select name="satisfactoria" defaultValue="" className={CAMPO}>
          <option value="">Sin evaluar</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={ETIQUETA_MIN}>Observaciones</label>
        <input name="observaciones" className={CAMPO} />
      </div>
      <label className="flex items-end gap-2 pb-2 text-sm text-ink">
        <input type="checkbox" name="traslado" className="h-4 w-4 accent-[var(--color-brass)]" />
        Hubo traslado
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "+ Registrar"}
        </button>
        {estado.error && <p className="mt-1 text-xs text-red-700">{estado.error}</p>}
      </div>
    </form>
  );
}

export function BotonEliminarEmergencia({ sucursalId, id }: { sucursalId: string; id: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm("¿Eliminar este registro?")) return;
        await eliminarEmergencia(sucursalId, id);
      }}
      className="text-xs text-red-700 hover:text-red-500 print:hidden"
    >
      Eliminar
    </button>
  );
}
