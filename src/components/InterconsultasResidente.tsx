"use client";

import { useActionState, useState } from "react";
import {
  cargarResultadoInterconsulta,
  crearInterconsulta,
  eliminarInterconsulta,
  type InterconsultaConUrl,
} from "@/app/residentes/[id]/accion-medica/interconsultas-actions";
import { ETIQUETA_TIPO_INTERCONSULTA } from "@/lib/interconsultas";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function FormularioResultado({
  residenteId,
  interconsulta,
  onListo,
}: {
  residenteId: string;
  interconsulta: InterconsultaConUrl;
  onListo: () => void;
}) {
  const accion = cargarResultadoInterconsulta.bind(null, residenteId, interconsulta.id);
  const [estado, formAction, enviando] = useActionState(async (prev: Estado, fd: FormData) => {
    const r = await accion(prev, fd);
    if (!r.error) onListo();
    return r;
  }, INICIAL);

  return (
    <form action={formAction} className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-edge bg-card p-3 sm:grid-cols-3">
      <div>
        <label className={ETIQUETA_MIN}>Fecha del resultado</label>
        <input type="date" name="fecha_resultado" defaultValue={hoy()} required className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Profesional / lugar</label>
        <input name="profesional" placeholder="Dr/a., laboratorio, hospital" className={CAMPO} />
      </div>
      <div className="sm:col-span-3">
        <label className={ETIQUETA_MIN}>Resultado / indicaciones</label>
        <textarea name="resultado" rows={3} className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA_MIN}>Informe adjunto (foto o PDF, opcional)</label>
        <input type="file" name="archivo" accept="image/*,application/pdf" className={CAMPO} />
      </div>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar resultado"}
        </button>
        <button type="button" onClick={onListo} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
      </div>
      {estado.error && <p className="text-xs text-red-700 sm:col-span-3">{estado.error}</p>}
    </form>
  );
}

function FilaInterconsulta({
  residenteId,
  interconsulta,
  puedeEliminar,
}: {
  residenteId: string;
  interconsulta: InterconsultaConUrl;
  puedeEliminar: boolean;
}) {
  const [cargando, setCargando] = useState(false);
  const i = interconsulta;
  const diasEspera = i.fecha_pedido
    ? Math.floor((new Date(hoy()).getTime() - new Date(i.fecha_pedido).getTime()) / 86_400_000)
    : null;

  async function borrar() {
    if (!window.confirm("¿Eliminar esta interconsulta?")) return;
    await eliminarInterconsulta(residenteId, i.id);
  }

  return (
    <div className="rounded-lg border border-edge bg-panel-deep p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">
            {ETIQUETA_TIPO_INTERCONSULTA[i.tipo]}
            {i.detalle && <span className="font-normal text-ink-soft"> · {i.detalle}</span>}
          </p>
          <p className="text-xs text-ink-soft">
            Pedido: {formatearFecha(i.fecha_pedido ?? i.created_at.slice(0, 10))}
            {i.motivo && ` · Motivo: ${i.motivo}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {i.resuelta ? (
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800">
              Con resultado
            </span>
          ) : (
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${
                diasEspera !== null && diasEspera > 15
                  ? "border-red-300 bg-red-100 text-red-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              }`}
            >
              Pendiente{diasEspera !== null && diasEspera > 0 ? ` · ${diasEspera} días` : ""}
            </span>
          )}
          {!i.resuelta && !cargando && (
            <button
              type="button"
              onClick={() => setCargando(true)}
              className="text-xs font-semibold text-brass hover:text-ink"
            >
              Cargar resultado
            </button>
          )}
          {puedeEliminar && (
            <button type="button" onClick={borrar} className="text-xs text-red-700 hover:text-red-500">
              Eliminar
            </button>
          )}
        </div>
      </div>

      {i.resuelta && (i.resultado || i.urlFirmada || i.fecha_resultado) && (
        <div className="mt-2 border-t border-edge pt-2 text-xs text-ink">
          <p className="text-ink-soft">
            Resultado: {formatearFecha(i.fecha_resultado)}
            {i.profesional && ` · ${i.profesional}`}
          </p>
          {i.resultado && <p className="mt-1 whitespace-pre-wrap">{i.resultado}</p>}
          {i.urlFirmada && (
            <a
              href={i.urlFirmada}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Ver informe adjunto{i.nombre_archivo ? ` (${i.nombre_archivo})` : ""}
            </a>
          )}
        </div>
      )}

      {cargando && (
        <FormularioResultado residenteId={residenteId} interconsulta={i} onListo={() => setCargando(false)} />
      )}
    </div>
  );
}

export function InterconsultasResidente({
  residenteId,
  interconsultas,
  puedeEliminar,
}: {
  residenteId: string;
  interconsultas: InterconsultaConUrl[];
  puedeEliminar: boolean;
}) {
  const accion = crearInterconsulta.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">Interconsultas</h2>

      <form action={formAction} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className={ETIQUETA_MIN}>Tipo</label>
          <select name="tipo" defaultValue="derivacion_externa" className={CAMPO}>
            {Object.entries(ETIQUETA_TIPO_INTERCONSULTA).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Especialidad / estudio</label>
          <input name="detalle" placeholder="Ej: Cardiología, Hemograma" className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Fecha de pedido</label>
          <input type="date" name="fecha_pedido" defaultValue={hoy()} className={CAMPO} />
        </div>
        <div className="sm:col-span-4">
          <label className={ETIQUETA_MIN}>Motivo</label>
          <input name="motivo" placeholder="Motivo de la interconsulta" className={CAMPO} />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "+ Pedir interconsulta"}
          </button>
          {estado.error && <p className="mt-1 text-xs text-red-700">{estado.error}</p>}
        </div>
      </form>

      <div className="space-y-2">
        {interconsultas.map((i) => (
          <FilaInterconsulta key={i.id} residenteId={residenteId} interconsulta={i} puedeEliminar={puedeEliminar} />
        ))}
        {interconsultas.length === 0 && <p className="text-xs text-ink-soft">Sin interconsultas registradas.</p>}
      </div>
    </section>
  );
}
