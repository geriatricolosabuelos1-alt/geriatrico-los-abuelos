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
  esMedico: boolean;
};

export function SelectorResidenteEvaluacion({ residentes, pinConfigurado, residenteIdInicial, esMedico }: Props) {
  const [residenteId, setResidenteId] = useState(residenteIdInicial ?? "");
  const [datos, setDatos] = useState<DatosResidenteEvaluacion | null>(null);
  const [cargando, startTransition] = useTransition();
  // Si el residente ya tiene un documento pendiente de firma, se abre directamente para seguir
  // editándolo (no en blanco). "nuevo" es cuando se pide expresamente uno nuevo.
  const [nuevo, setNuevo] = useState(false);
  const [version, setVersion] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

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
      setNuevo(false);
      setVersion((v) => v + 1);
      setAviso(
        esMedico
          ? "Guardado y firmado ✓"
          : "Guardado ✓ Quedó pendiente de firma de la médica. Podés seguir corrigiéndolo acá.",
      );
    });
  }

  function cambiarResidente(nuevoId: string) {
    setResidenteId(nuevoId);
    setDatos(null);
    setNuevo(false);
    setAviso(null);
  }

  const edad = datos ? calcularEdad(datos.fechaNacimiento) : null;
  const evaluacionPendiente = datos?.evaluaciones.find((e) => !e.firmado_por) ?? null;
  const indicacionPendiente = datos?.indicaciones.find((i) => !i.firmado_por) ?? null;
  const revisando = !!evaluacionPendiente && !nuevo;
  const ultimaFirmada = datos?.indicaciones.find((i) => i.firmado_por) ?? null;

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

            {aviso && (
              <p className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
                {aviso}
              </p>
            )}

            {evaluacionPendiente && !revisando && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">Pendiente de firma médica:</span> evaluación del{" "}
                  {evaluacionPendiente.fecha.split("-").reverse().join("/")}
                  {indicacionPendiente ? " con sus indicaciones" : ""}.
                </p>
                <button
                  type="button"
                  onClick={() => setNuevo(false)}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  {esMedico ? "Revisar y firmar" : "Corregir"}
                </button>
              </div>
            )}

            <EvaluacionIndicacionesForm
              key={`${revisando && evaluacionPendiente ? `borrador-${evaluacionPendiente.id}` : "nuevo"}-${version}`}
              residenteId={residenteId}
              pinConfigurado={pinConfigurado}
              ultimaIndicacion={ultimaFirmada ?? datos.indicaciones[0] ?? null}
              onGuardado={recargar}
              esMedico={esMedico}
              borrador={
                revisando && evaluacionPendiente
                  ? { evaluacion: evaluacionPendiente, indicacion: indicacionPendiente }
                  : null
              }
              itemsKardex={datos.itemsKardex}
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
