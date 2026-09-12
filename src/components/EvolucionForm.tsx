"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarEvolucionYCerrar, resolverInterconsulta } from "@/app/residentes/[id]/accion-medica/actions";
import { EXAMEN_FISICO_NORMAL } from "@/lib/clinica";
import type { Interconsulta, TipoVisitaMedica } from "@/lib/types";

type Props = {
  residenteId: string;
  siguienteResidenteId: string | null;
  interconsultas: Interconsulta[];
  pinConfigurado: boolean;
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

const ETIQUETA_VISITA: Record<TipoVisitaMedica, string> = {
  control_rutina: "Control de rutina mensual",
  pase_diario: "Pase diario",
  evaluacion_post_caida: "Evaluación post-caída",
  descompensacion_aguda: "Descompensación aguda",
};

const ETIQUETA_TIPO_INTERCONSULTA: Record<Interconsulta["tipo"], string> = {
  laboratorio: "Laboratorio",
  derivacion_externa: "Derivación externa",
  kinesiologia: "Kinesiología",
  nutricion: "Nutrición",
};

export function EvolucionForm({ residenteId, siguienteResidenteId, interconsultas, pinConfigurado }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [objetivo, setObjetivo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pendientes = interconsultas.filter((i) => !i.resuelta);

  function enviar(irSiguiente: boolean) {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;
    const fd = new FormData(formRef.current);
    setError(null);

    startTransition(async () => {
      const res = await guardarEvolucionYCerrar(
        residenteId,
        irSiguiente ? siguienteResidenteId : null,
        { error: null },
        fd,
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      if (irSiguiente && siguienteResidenteId) {
        router.push(`/residentes/${siguienteResidenteId}/accion-medica`);
      } else {
        formRef.current?.reset();
        setObjetivo("");
        router.refresh();
      }
    });
  }

  async function resolver(id: string) {
    await resolverInterconsulta(residenteId, id);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">Evolución clínica</h2>

      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-3">
        <div>
          <label className={ETIQUETA_MIN}>Tipo de visita</label>
          <select name="tipo_visita" required defaultValue="" className={CAMPO}>
            <option value="" disabled>
              Elegí...
            </option>
            {Object.entries(ETIQUETA_VISITA).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={ETIQUETA_MIN}>Subjetivo</label>
          <textarea
            name="subjetivo"
            rows={2}
            placeholder="Estado de ánimo, lo que refiere el residente o transmiten los cuidadores"
            className={CAMPO}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className={ETIQUETA_MIN}>Objetivo</label>
            <button
              type="button"
              onClick={() => setObjetivo(EXAMEN_FISICO_NORMAL)}
              className="text-[0.65rem] text-brass hover:text-ink"
            >
              Cargar examen físico normal estándar
            </button>
          </div>
          <textarea
            name="objetivo"
            rows={3}
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="Examen físico por aparatos"
            className={CAMPO}
          />
        </div>

        <div>
          <label className={ETIQUETA_MIN}>Apreciación diagnóstica</label>
          <input
            name="apreciacion_diagnostico"
            placeholder="Ej: Sospecha de infección urinaria"
            className={CAMPO}
          />
        </div>

        <div>
          <label className={ETIQUETA_MIN}>Plan terapéutico</label>
          <textarea
            name="plan_terapeutico"
            rows={2}
            placeholder="Próximos pasos: solicitar urocultivo, hidratación parenteral..."
            className={CAMPO}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-edge bg-panel-deep p-3">
          <p className={ETIQUETA_MIN}>Interconsultas y pedidos de rutina</p>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input type="checkbox" name="interconsulta_laboratorio" />
            Solicitar laboratorio (rutina básica, perfil renal, ionograma)
          </label>
          <input
            name="derivacion_especialidad"
            placeholder="Derivación a especialidad externa (ej: Cardiología)"
            className={CAMPO}
          />
          <input
            name="indicacion_kinesiologia"
            placeholder="Indicación a Kinesiología (ej: intensificar marcha)"
            className={CAMPO}
          />
          <input
            name="indicacion_nutricion"
            placeholder="Indicación a Nutrición (ej: paso a papilla)"
            className={CAMPO}
          />

          {pendientes.length > 0 && (
            <div className="border-t border-edge pt-2">
              <p className={ETIQUETA_MIN}>Pendientes</p>
              {pendientes.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-xs text-ink-soft">
                  <span>
                    {ETIQUETA_TIPO_INTERCONSULTA[i.tipo]}
                    {i.detalle && `: ${i.detalle}`}
                  </span>
                  <button type="button" onClick={() => resolver(i.id)} className="text-brass hover:text-ink">
                    Marcar resuelta
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="estable" defaultChecked />
          Residente estable / sin cambios agudos
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={ETIQUETA_MIN}>Matrícula</label>
            <input name="matricula" className="w-32 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none" />
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
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => enviar(false)}
            disabled={pending}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar y Cerrar"}
          </button>
          {siguienteResidenteId && (
            <button
              type="button"
              onClick={() => enviar(true)}
              disabled={pending}
              className="rounded-lg border border-brass px-4 py-2 text-sm font-semibold text-brass hover:bg-brass-soft disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar y Siguiente Residente"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
