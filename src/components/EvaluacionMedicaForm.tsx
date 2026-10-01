"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarEvaluacionMedica } from "@/app/residentes/[id]/accion-medica/evaluacion-actions";
import { hoyArgentina } from "@/lib/fechas";

type Props = {
  residenteId: string;
  pinConfigurado: boolean;
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

const CONCIENCIA = ["Vigil", "Somnoliento", "Obnubilado", "Estuporoso"];
const ORIENTACION = ["Orientado en tiempo y espacio", "Orientado en espacio", "Orientado en persona", "Desorientado"];
const ALIMENTACION = ["Vía oral", "Nasogástrica", "Gastrostoma"];
const CONSISTENCIA = ["Normal", "Modificada", "Blanda", "Triturada", "Líq. espesa"];
const MARCHA = ["Deambula independiente", "Utiliza bastón", "Utiliza andador", "Utiliza silla de ruedas", "No deambula"];
const URINARIO = ["Continente urinario", "Incontinencia urinaria", "Usa pañal"];
const FECAL = ["Continente fecal", "Incontinencia fecal"];

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

export function EvaluacionMedicaForm({ residenteId, pinConfigurado }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function enviar() {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;
    const fd = new FormData(formRef.current);
    setError(null);

    startTransition(async () => {
      const res = await guardarEvaluacionMedica(residenteId, { error: null }, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setAbierto(false);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-brass px-4 py-2 text-sm font-semibold text-brass hover:bg-brass/10"
      >
        + Nueva evaluación médica
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-2xl border border-edge bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink">Evaluación médica</h3>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-ink-soft hover:text-ink">
          ✕
        </button>
      </div>

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

      <div className="flex flex-wrap items-end gap-3 border-t border-edge pt-3">
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
          {pending ? "Guardando..." : "Firmar y guardar"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
