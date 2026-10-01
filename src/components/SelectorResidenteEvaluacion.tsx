"use client";

import { useEffect, useState, useTransition } from "react";
import {
  obtenerDatosResidenteEvaluacion,
  type DatosResidenteEvaluacion,
  type ResidenteListado,
} from "@/app/residentes/[id]/accion-medica/evaluacion-actions";
import { EvaluacionIndicacionesForm } from "@/components/EvaluacionIndicacionesForm";
import { HistorialEvaluacionesMedicas } from "@/components/HistorialEvaluacionesMedicas";
import { HistorialIndicacionesMedicas } from "@/components/HistorialIndicacionesMedicas";
import { ExportarPdfEvaluacionMedica } from "@/components/ExportarPdfEvaluacionMedica";
import { calcularEdad } from "@/lib/residentes";

type Props = {
  residentes: ResidenteListado[];
  pinConfigurado: boolean;
  residenteIdInicial: string | null;
};

export function SelectorResidenteEvaluacion({ residentes, pinConfigurado, residenteIdInicial }: Props) {
  const [residenteId, setResidenteId] = useState(residenteIdInicial ?? "");
  const [datos, setDatos] = useState<DatosResidenteEvaluacion | null>(null);
  const [cargando, startTransition] = useTransition();

  useEffect(() => {
    if (!residenteId) return;
    startTransition(async () => {
      const res = await obtenerDatosResidenteEvaluacion(residenteId);
      setDatos(res);
    });
  }, [residenteId]);

  function recargar() {
    if (!residenteId) return;
    startTransition(async () => {
      const res = await obtenerDatosResidenteEvaluacion(residenteId);
      setDatos(res);
    });
  }

  function cambiarResidente(nuevoId: string) {
    setResidenteId(nuevoId);
    setDatos(null);
  }

  const edad = datos ? calcularEdad(datos.fechaNacimiento) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-edge bg-card p-4">
        <label className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Residente
        </label>
        <select
          value={residenteId}
          onChange={(e) => cambiarResidente(e.target.value)}
          className="w-full max-w-md rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">Elegí un residente…</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
              {r.habitacion ? ` — Hab. ${r.habitacion}` : ""}
            </option>
          ))}
        </select>
      </div>

      {cargando && <p className="text-sm text-ink-soft">Cargando datos del residente...</p>}

      {!cargando && residenteId && datos && (
        <>
          <div className="rounded-2xl border border-edge bg-panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  {datos.apellido}, {datos.nombre}
                </h2>
                <p className="text-xs text-ink-soft">
                  DNI {datos.dni ?? "—"} · Edad {edad !== null ? `${edad} años` : "—"} · Obra social{" "}
                  {datos.obraSocial ?? "—"} · Afiliado {datos.afiliado ?? "—"}
                </p>
              </div>
              <ExportarPdfEvaluacionMedica
                residenteNombre={`${datos.apellido}, ${datos.nombre}`}
                sede={datos.sede}
                dni={datos.dni}
                edad={edad}
                fechaNacimiento={datos.fechaNacimiento}
                obraSocial={datos.obraSocial}
                afiliado={datos.afiliado}
                evaluacion={datos.evaluaciones[0] ?? null}
                indicacion={datos.indicaciones[0] ?? null}
              />
            </div>

            <EvaluacionIndicacionesForm
              residenteId={residenteId}
              pinConfigurado={pinConfigurado}
              ultimaIndicacion={datos.indicaciones[0] ?? null}
              onGuardado={recargar}
            />
          </div>

          <HistorialEvaluacionesMedicas evaluaciones={datos.evaluaciones} />
          <HistorialIndicacionesMedicas indicaciones={datos.indicaciones} />
        </>
      )}

      {!cargando && residenteId && !datos && (
        <p className="text-sm text-red-700">No se pudo cargar la información de este residente.</p>
      )}
    </div>
  );
}
