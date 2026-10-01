"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { guardarEvaluacionIndicacionMedica } from "@/app/residentes/[id]/accion-medica/evaluacion-actions";
import { hoyArgentina } from "@/lib/fechas";
import type { IndicacionMedica, ItemIndicacionMedica } from "@/lib/types";

type Props = {
  residenteId: string;
  pinConfigurado: boolean;
  ultimaIndicacion: IndicacionMedica | null;
  onGuardado: () => void;
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const CAMPO_CHICO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

const CONCIENCIA = ["Vigil", "Somnoliento", "Obnubilado", "Estuporoso"];
const ORIENTACION = ["Orientado en tiempo y espacio", "Orientado en espacio", "Orientado en persona", "Desorientado"];
const ALIMENTACION = ["Vía oral", "Nasogástrica", "Gastrostoma"];
const CONSISTENCIA = ["Normal", "Modificada", "Blanda", "Triturada", "Líq. espesa"];
const MARCHA = ["Deambula independiente", "Utiliza bastón", "Utiliza andador", "Utiliza silla de ruedas", "No deambula"];
const URINARIO = ["Continente urinario", "Incontinencia urinaria", "Usa pañal"];
const FECAL = ["Continente fecal", "Incontinencia fecal"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function GrupoRadio({ nombre, opciones, defaultValue }: { nombre: string; opciones: string[]; defaultValue?: string }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {opciones.map((op) => (
        <label key={op} className="flex items-center gap-1.5 text-sm text-ink">
          <input type="radio" name={nombre} value={op} defaultChecked={op === defaultValue} className="h-4 w-4 accent-[var(--color-brass)]" />
          {op}
        </label>
      ))}
    </div>
  );
}

function filaVacia(): ItemIndicacionMedica {
  return { medicacion: "", mg: "", cantidad: "", h8: false, h12: false, h20: false };
}

function mesIndice(fechaISO: string): { mes: number; anio: number } {
  const [anio, mes] = fechaISO.split("-").map(Number);
  return { mes: mes - 1, anio };
}

export function EvaluacionIndicacionesForm({ residenteId, pinConfigurado, ultimaIndicacion, onGuardado }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hoy = useMemo(() => mesIndice(hoyArgentina()), []);
  const [mesDesdeIdx, setMesDesdeIdx] = useState(hoy.mes);
  const [mesHastaIdx, setMesHastaIdx] = useState(hoy.mes);
  const [anio, setAnio] = useState(hoy.anio);
  const [filas, setFilas] = useState<ItemIndicacionMedica[]>([filaVacia()]);

  function repetirUltimoPeriodo() {
    if (!ultimaIndicacion) return;
    setFilas(ultimaIndicacion.items.length > 0 ? ultimaIndicacion.items.map((f) => ({ ...f })) : [filaVacia()]);
    const { mes, anio: anioNuevo } = mesIndice(ultimaIndicacion.periodo_hasta);
    const siguiente = mes + 1 > 11 ? 0 : mes + 1;
    const anioSiguiente = mes + 1 > 11 ? anioNuevo + 1 : anioNuevo;
    setMesDesdeIdx(siguiente);
    setMesHastaIdx(siguiente);
    setAnio(anioSiguiente);
  }

  function actualizarFila(i: number, campo: keyof ItemIndicacionMedica, valor: string | boolean) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  function quitarFila(i: number) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function enviar() {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;

    const fd = new FormData(formRef.current);
    const filasConMedicacion = filas.filter((f) => f.medicacion.trim());
    if (filasConMedicacion.length > 0) {
      const periodo_desde = `${anio}-${String(mesDesdeIdx + 1).padStart(2, "0")}-01`;
      const ultimoDiaHasta = new Date(anio, mesHastaIdx + 1, 0).getDate();
      const periodo_hasta = `${anio}-${String(mesHastaIdx + 1).padStart(2, "0")}-${String(ultimoDiaHasta).padStart(2, "0")}`;
      fd.set("periodo_desde", periodo_desde);
      fd.set("periodo_hasta", periodo_hasta);
    }
    fd.set("items", JSON.stringify(filasConMedicacion));
    setError(null);

    startTransition(async () => {
      const res = await guardarEvaluacionIndicacionMedica(residenteId, { error: null }, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setFilas([filaVacia()]);
      setMesDesdeIdx(hoy.mes);
      setMesHastaIdx(hoy.mes);
      setAnio(hoy.anio);
      onGuardado();
    });
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-5 rounded-2xl border border-edge bg-card p-5">
      <h3 className="font-display text-base font-semibold text-ink">Evaluación médica</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={ETIQUETA_MIN}>Fecha de evaluación</label>
          <input type="date" name="fecha" required defaultValue={hoyArgentina()} className={CAMPO} />
        </div>
        <div className="sm:col-span-2">
          <label className={ETIQUETA_MIN}>Antecedentes</label>
          <input name="antecedentes" placeholder="Ej: HTA, HPB, ansiedad" className={CAMPO} />
        </div>
      </div>

      <fieldset className="rounded-lg border border-edge p-3">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Estado de conciencia</legend>
        <GrupoRadio nombre="estado_conciencia" opciones={CONCIENCIA} defaultValue="Vigil" />
      </fieldset>

      <fieldset className="rounded-lg border border-edge p-3">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Orientación</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {ORIENTACION.map((op) => (
            <label key={op} className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="orientacion" value={op} className="h-4 w-4 accent-[var(--color-brass)]" />
              {op}
            </label>
          ))}
        </div>
        <input name="obs_orientacion" placeholder="Observaciones (opcional)" className={`${CAMPO} mt-2 text-xs`} />
      </fieldset>

      <fieldset className="rounded-lg border border-edge p-3">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Alimentación</legend>
        <GrupoRadio nombre="alimentacion" opciones={ALIMENTACION} defaultValue="Vía oral" />
        <p className="mb-1 mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">Consistencia</p>
        <GrupoRadio nombre="consistencia" opciones={CONSISTENCIA} defaultValue="Normal" />
        <input name="obs_alimentacion" placeholder="Observaciones (opcional)" className={`${CAMPO} mt-2 text-xs`} />
      </fieldset>

      <fieldset className="rounded-lg border border-edge p-3">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Marcha / Movilidad</legend>
        <GrupoRadio nombre="marcha_movilidad" opciones={MARCHA} />
      </fieldset>

      <fieldset className="rounded-lg border border-edge p-3">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Control de esfínteres</legend>
        <GrupoRadio nombre="control_urinario" opciones={URINARIO} defaultValue="Continente urinario" />
        <div className="mt-2">
          <GrupoRadio nombre="control_fecal" opciones={FECAL} defaultValue="Continente fecal" />
        </div>
        <input name="obs_esfinteres" placeholder="Observaciones (opcional)" className={`${CAMPO} mt-2 text-xs`} />
      </fieldset>

      <div>
        <label className={ETIQUETA_MIN}>Conducta</label>
        <textarea name="conducta" rows={2} defaultValue="Continúa con mismo plan." className={CAMPO} />
      </div>

      <div className="border-t border-edge pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-ink">Indicaciones médicas</h3>
          {ultimaIndicacion && (
            <button
              type="button"
              onClick={repetirUltimoPeriodo}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
            >
              ↻ Repetir último período, igual indicación
            </button>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <label className={ETIQUETA_MIN}>Período — desde</label>
            <select
              value={mesDesdeIdx}
              onChange={(e) => setMesDesdeIdx(Number(e.target.value))}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ETIQUETA_MIN}>Hasta</label>
            <select
              value={mesHastaIdx}
              onChange={(e) => setMesHastaIdx(Number(e.target.value))}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ maxWidth: 90 }}>
            <label className={ETIQUETA_MIN}>Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value) || anio)}
              className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            />
          </div>
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          El cuadro se mantiene igual todos los meses hasta que lo modifiques — solo cambiás el período y volvés a firmar.
        </p>

        <div className="overflow-x-auto rounded-xl border border-edge">
          <table className="w-full text-left text-sm" style={{ minWidth: 520 }}>
            <thead className="border-b border-edge bg-panel-deep text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2">Medicación</th>
                <th className="w-16 px-2 py-2">MG</th>
                <th className="w-20 px-2 py-2">Cant. comp.</th>
                <th className="w-14 px-2 py-2 text-center">8HS</th>
                <th className="w-14 px-2 py-2 text-center">12HS</th>
                <th className="w-14 px-2 py-2 text-center">20HS</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} className="border-b border-edge last:border-0">
                  <td className="px-2 py-1.5">
                    <input value={f.medicacion} onChange={(e) => actualizarFila(i, "medicacion", e.target.value)} className={CAMPO_CHICO} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={f.mg} onChange={(e) => actualizarFila(i, "mg", e.target.value)} className={CAMPO_CHICO} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={f.cantidad} onChange={(e) => actualizarFila(i, "cantidad", e.target.value)} className={CAMPO_CHICO} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={f.h8} onChange={(e) => actualizarFila(i, "h8", e.target.checked)} className="h-4 w-4 accent-[var(--color-brass)]" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={f.h12} onChange={(e) => actualizarFila(i, "h12", e.target.checked)} className="h-4 w-4 accent-[var(--color-brass)]" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={f.h20} onChange={(e) => actualizarFila(i, "h20", e.target.checked)} className="h-4 w-4 accent-[var(--color-brass)]" />
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <button type="button" onClick={() => quitarFila(i)} className="text-red-700 hover:text-red-500" title="Quitar">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => setFilas((prev) => [...prev, filaVacia()])}
          className="mt-2 rounded-lg border border-dashed border-edge bg-panel-deep px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brass hover:text-ink"
        >
          + Agregar medicamento
        </button>

        <div className="mt-3">
          <label className={ETIQUETA_MIN}>Observaciones de indicaciones</label>
          <textarea name="observaciones" rows={2} className={CAMPO} placeholder="Opcional" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-edge pt-4">
        <div>
          <label className={ETIQUETA_MIN}>Matrícula</label>
          <input
            name="matricula"
            className="w-32 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN} title={pinConfigurado ? "Ingresá tu PIN para firmar" : "Primera vez: elegí un PIN de 4 a 6 dígitos"}>
            {pinConfigurado ? "PIN de seguridad" : "Configurá tu PIN (primera vez)"}
          </label>
          <input
            type="password"
            inputMode="numeric"
            name="pin"
            required
            minLength={4}
            maxLength={6}
            className="w-28 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Firmar y guardar documento"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
