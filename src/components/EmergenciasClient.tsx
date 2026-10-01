"use client";

import { useActionState, useRef, useState } from "react";
import {
  adjuntarIndicacionEmergencia,
  eliminarEmergencia,
  registrarEmergencia,
} from "@/app/sucursales/[id]/legales/emergencias-actions";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

// Vercel corta los envíos de más de 4,5 MB: se avisa antes de subir.
const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS_ARCHIVO = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function problemaArchivo(archivo: FormDataEntryValue | null): string | null {
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  if (!TIPOS_ARCHIVO.includes(archivo.type)) return "La indicación tiene que ser un PDF o una foto (JPG/PNG).";
  if (archivo.size > MAX_BYTES) {
    return `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo es 4 MB. Comprimilo o sacá la foto en menor calidad.`;
  }
  return null;
}

function ahoraArgentina(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Mendoza",
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
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const ahora = ahoraArgentina();

  return (
    <form
      action={(formData) => {
        const problema = problemaArchivo(formData.get("indicacion"));
        setErrorArchivo(problema);
        if (!problema) formAction(formData);
      }}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
    >
      <h2 className="font-display text-base font-semibold text-ink sm:col-span-2 lg:col-span-4">
        Registrar llamada de ambulancia / emergencia
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
        <label className={ETIQUETA_MIN}>Receta / indicación de la ambulancia (PDF o foto, opcional)</label>
        <input
          type="file"
          name="indicacion"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="text-xs text-ink"
        />
        <p className="mt-1 text-[0.7rem] text-ink-soft">Queda guardada en el legajo del residente elegido arriba.</p>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "+ Registrar"}
        </button>
        {(errorArchivo ?? estado.error) && (
          <p className="mt-1 text-xs text-red-700">{errorArchivo ?? estado.error}</p>
        )}
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

// Adjuntar la receta / indicación a una llamada ya registrada.
export function AdjuntarIndicacion({ sucursalId, emergenciaId }: { sucursalId: string; emergenciaId: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File) {
    const datos = new FormData();
    datos.set("indicacion", archivo);
    const problema = problemaArchivo(archivo);
    if (problema) {
      setError(problema);
      return;
    }
    setSubiendo(true);
    setError(null);
    const resultado = await adjuntarIndicacionEmergencia(sucursalId, emergenciaId, datos);
    setSubiendo(false);
    if (resultado.error) setError(resultado.error);
  }

  return (
    <span className="print:hidden">
      <input
        ref={entrada}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) subir(archivo);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={subiendo}
        className="text-xs text-brass hover:text-ink disabled:opacity-50"
      >
        {subiendo ? "Subiendo..." : "+ Adjuntar"}
      </button>
      {error && <span className="block max-w-[180px] text-xs text-red-700">{error}</span>}
    </span>
  );
}
