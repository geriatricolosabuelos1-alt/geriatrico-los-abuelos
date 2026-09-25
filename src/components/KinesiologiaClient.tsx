"use client";

import { useActionState, useState } from "react";
import {
  eliminarRegistroKinesio,
  guardarEvaluacionKinesio,
  registrarSesionKinesio,
} from "@/app/residentes/[id]/kinesiologia/actions";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

const OPCIONES_KINESIO = {
  movilidad: ["Independiente", "Con supervisión", "Con ayuda parcial", "Dependiente", "Postrado"],
  transferencias: ["Independiente", "Con supervisión", "Con asistencia de 1 persona", "Con asistencia de 2 personas", "Dependiente total"],
  marcha: ["Normal", "Alterada, estable", "Alterada, inestable", "Solo con ayuda técnica", "No deambula"],
  equilibrio: ["Bueno", "Regular", "Malo"],
  riesgo_caida: ["Bajo", "Medio", "Alto"],
  tolerancia: ["Buena", "Regular", "Mala"],
  ayudas_tecnicas: ["Bastón", "Trípode", "Andador", "Silla de ruedas", "Ortesis", "Ninguna"],
};

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

function Selector({ nombre, etiqueta, opciones }: { nombre: string; etiqueta: string; opciones: string[] }) {
  return (
    <div>
      <label className={ETIQUETA_MIN}>{etiqueta}</label>
      <select name={nombre} defaultValue="" className={CAMPO}>
        <option value="">—</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormularioEvaluacionKinesio({ residenteId }: { residenteId: string }) {
  const [abierto, setAbierto] = useState(false);
  const accion = guardarEvaluacionKinesio.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(async (prev: Estado, fd: FormData) => {
    const r = await accion(prev, fd);
    if (!r.error) setAbierto(false);
    return r;
  }, INICIAL);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-brass px-4 py-2 text-sm font-semibold text-brass hover:bg-brass/10 print:hidden"
      >
        + Nueva evaluación
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
    >
      <h3 className="font-display text-base font-semibold text-ink sm:col-span-2 lg:col-span-4">
        Evaluación kinésica
      </h3>
      <div>
        <label className={ETIQUETA_MIN}>Fecha</label>
        <input type="date" name="fecha" required defaultValue={hoy()} className={CAMPO} />
      </div>
      <div className="sm:col-span-1 lg:col-span-3">
        <label className={ETIQUETA_MIN}>Motivo / derivación</label>
        <input name="motivo" placeholder="Ej: evaluación de ingreso, caída reciente" className={CAMPO} />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <label className={ETIQUETA_MIN}>Diagnóstico kinésico</label>
        <input name="diagnostico" className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Dolor (EVA 0-10)</label>
        <input type="number" name="dolor_eva" min={0} max={10} className={CAMPO} />
      </div>
      <div className="lg:col-span-3">
        <label className={ETIQUETA_MIN}>Localización del dolor</label>
        <input name="dolor_localizacion" className={CAMPO} />
      </div>
      <Selector nombre="movilidad" etiqueta="Movilidad" opciones={OPCIONES_KINESIO.movilidad} />
      <Selector nombre="transferencias" etiqueta="Transferencias" opciones={OPCIONES_KINESIO.transferencias} />
      <Selector nombre="marcha" etiqueta="Marcha" opciones={OPCIONES_KINESIO.marcha} />
      <Selector nombre="equilibrio" etiqueta="Equilibrio" opciones={OPCIONES_KINESIO.equilibrio} />
      <Selector nombre="riesgo_caida" etiqueta="Riesgo de caída" opciones={OPCIONES_KINESIO.riesgo_caida} />
      <div>
        <label className={ETIQUETA_MIN}>Caídas en el último año</label>
        <input type="number" name="caidas_ultimo_anio" min={0} className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <p className={ETIQUETA_MIN}>Ayudas técnicas</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {OPCIONES_KINESIO.ayudas_tecnicas.map((a) => (
            <label key={a} className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="ayudas_tecnicas" value={a} className="h-4 w-4 accent-[var(--color-brass)]" />
              {a}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Fuerza muscular</label>
        <textarea name="fuerza_muscular" rows={2} className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Rango articular</label>
        <textarea name="rango_articular" rows={2} className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Objetivos</label>
        <textarea name="objetivos" rows={2} className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Plan de tratamiento</label>
        <textarea name="plan" rows={2} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Sesiones por semana</label>
        <input type="number" name="sesiones_semanales" min={0} max={14} className={CAMPO} />
      </div>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar evaluación"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        {estado.error && <p className="text-xs text-red-700">{estado.error}</p>}
      </div>
    </form>
  );
}

export function FormularioSesionKinesio({ residenteId }: { residenteId: string }) {
  const accion = registrarSesionKinesio.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-edge bg-panel-deep p-3 sm:grid-cols-4 print:hidden"
    >
      <div>
        <label className={ETIQUETA_MIN}>Fecha</label>
        <input type="date" name="fecha" required defaultValue={hoy()} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Duración (min)</label>
        <input type="number" name="duracion_minutos" min={0} defaultValue={30} className={CAMPO} />
      </div>
      <Selector nombre="tolerancia" etiqueta="Tolerancia" opciones={OPCIONES_KINESIO.tolerancia} />
      <div className="sm:col-span-4">
        <label className={ETIQUETA_MIN}>Trabajo realizado</label>
        <input
          name="trabajo_realizado"
          required
          placeholder="Ej: marcha asistida 10 min, fortalecimiento MMII, ejercicios respiratorios"
          className={CAMPO}
        />
      </div>
      <div className="sm:col-span-4">
        <label className={ETIQUETA_MIN}>Evolución / observaciones</label>
        <input name="evolucion" className={CAMPO} />
      </div>
      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "+ Registrar sesión"}
        </button>
        {estado.error && <p className="mt-1 text-xs text-red-700">{estado.error}</p>}
      </div>
    </form>
  );
}

export function BotonEliminarKinesio({
  residenteId,
  tabla,
  id,
}: {
  residenteId: string;
  tabla: "evaluacion" | "sesion";
  id: string;
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm("¿Eliminar este registro?")) return;
        await eliminarRegistroKinesio(residenteId, tabla, id);
      }}
      className="text-xs text-red-700 hover:text-red-500 print:hidden"
    >
      Eliminar
    </button>
  );
}
